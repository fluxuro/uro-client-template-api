const knex = require("../configs/knex/knex");
const { ValidationError } = require("../middleware/errorHandler");
const jobService = require("../services/database/jobService");

const { UROClient, generateJobId } = require("../services/uro");
const logger = require("../utils/logger");
const { paginated } = require("../utils/responseFormatter");
const _ = require("lodash");
const getProviderModelByModelId = async (modelId) => {
  const model = await knex("model")
    .where({ model_id: modelId })
    .select([
      "provider_model_type",
      "provider_model_id",
      "model_type",
      "cost_to_customer",
    ])
    .first();
  return model;
};

const getModelParamsConfig = async (modelId) => {
  const modelParamsConfig = await knex("model_parameter_config")
    .where({ model_id: modelId })
    .select([
      "model_parameter_config_id",
      "model_id",
      "parameter_title",
      "parameter_name",
      "is_private",
      "is_required",
      "data_type",
      "default_value",
      "allowed_values",
      "allowed_min_value",
      "allowed_max_value",
      "description",
      "created_at",
      "updated_at",
      "deleted",
      "group_tag",
    ]);
  return modelParamsConfig;
};

const validateParams = async (params, modelParamsConfig) => {
  try {
    const validatedParams = {};
    const privateParams = {};

    modelParamsConfig.forEach((param) => {
      const paramName = param.parameter_name;
      let value = params[paramName];

      // Use default when user did not provide a value
      if (
        (value === undefined || value === null || value === "") &&
        param.default_value !== undefined &&
        param.default_value !== null &&
        param.default_value !== ""
      ) {
        value = param.default_value;
      }

      // Throw if required and still missing
      if (
        (value === undefined || value === null || value === "") &&
        param.is_required
      ) {
        throw new Error(`Missing required parameter: ${paramName}`);
      }

      // Skip optional params that still have no value
      if (value === undefined || value === null || value === "") {
        return;
      }

      // Cast to correct data type
      switch (param.data_type) {
        case "integer": {
          value = Number(value);
          if (!Number.isInteger(value)) {
            throw new Error(`Parameter ${paramName} must be an integer`);
          }
          break;
        }
        case "float": {
          value = Number(value);
          if (Number.isNaN(value)) {
            throw new Error(`Parameter ${paramName} must be a float`);
          }
          break;
        }
        case "boolean": {
          if (typeof value === "string") {
            value =
              value.toLowerCase() === "true"
                ? true
                : value.toLowerCase() === "false"
                ? false
                : Boolean(value);
          } else {
            value = Boolean(value);
          }
          break;
        }
        case "object": {
          if (typeof value === "string") {
            try {
              value = JSON.parse(value);
            } catch (e) {
              throw new Error(
                `Parameter ${paramName} must be a valid JSON object`
              );
            }
          }
          break;
        }
        case "object[]": {
          if (typeof value === "string") {
            try {
              value = JSON.parse(value);
            } catch (e) {}
          }
          if (!Array.isArray(value)) {
            throw new Error(`Parameter ${paramName} must be an array`);
          }
          break;
        }
        case "string":
        default: {
          value = String(value);
          break;
        }
      }

      // Validate allowed values list
      if (param.allowed_values) {
        let allowed;
        try {
          allowed = JSON.parse(param.allowed_values);
        } catch (e) {
          allowed = String(param.allowed_values)
            .split(",")
            .map((v) => v.trim());
        }

        // Normalize allowed values to match data type
        if (param.data_type === "integer" || param.data_type === "float") {
          allowed = allowed.map((v) => Number(v));
        } else if (param.data_type === "boolean") {
          allowed = allowed.map((v) =>
            typeof v === "string"
              ? v.toLowerCase() === "true"
                ? true
                : v.toLowerCase() === "false"
                ? false
                : Boolean(v)
              : Boolean(v)
          );
        }

        if (!allowed.includes(value)) {
          throw new Error(
            `Invalid value for ${paramName}. Allowed values: ${allowed.join(
              ", "
            )}`
          );
        }
      }

      // Validate min / max for numeric values
      if (
        (param.data_type === "integer" || param.data_type === "float") &&
        (param.allowed_min_value !== undefined ||
          param.allowed_max_value !== undefined)
      ) {
        if (
          param.allowed_min_value !== undefined &&
          param.allowed_min_value !== null &&
          param.allowed_min_value !== "" &&
          value < Number(param.allowed_min_value)
        ) {
          throw new Error(
            `Value for ${paramName} must be >= ${param.allowed_min_value}`
          );
        }
        if (
          param.allowed_max_value !== undefined &&
          param.allowed_max_value !== null &&
          param.allowed_max_value !== "" &&
          value > Number(param.allowed_max_value)
        ) {
          throw new Error(
            `Value for ${paramName} must be <= ${param.allowed_max_value}`
          );
        }
      }

      if (param.is_private) {
        privateParams[paramName] = value;
      } else {
        validatedParams[paramName] = value;
      }
    });

    // Append private params at the end to preserve expected ordering
    Object.assign(validatedParams, privateParams);

    if (Object.keys(validatedParams).length === 0) {
      throw new Error("No valid parameters found");
    }

    return validatedParams;
  } catch (error) {
    logger.error("validateParams Error", {
      error: error.message,
      stack: error.stack,
      params,
      modelParamsConfig,
    });
    throw error;
  }
};
const runModel = async (req) => {
  let job_id;
  let deductedCoins = 0;
  let user_id;
  let customer_id;
  try {
    const { model_id, params } = req.body;
    console.log(req.body);
    user_id = req.body.user_id || req.query.user_id;
    customer_id = req.body.customer_id || req.query.customer_id;
    const model = await getProviderModelByModelId(model_id);
    const modelParamsConfig = await getModelParamsConfig(model_id);
    const provider_job_id = generateJobId();
    const validatedParams = await validateParams(params, modelParamsConfig);

    //check coins
    const customer_balance = 10; 
    // customerId: customer_id,

    console.log({
      customer_balance,
      model_cost: model.cost_to_customer,
      customer_id,
      user_id,
    });
    if (customer_balance < model.cost_to_customer) {
      throw new ValidationError("insufficient_balance");
    }

    job_id = await jobService.createJob({
      cost_to_client: 0,
      cost_to_customer: model.cost_to_customer || 0,
      job_input_params: validatedParams,
      user_id,
      customer_id,
      provider_job_type: model.provider_model_type,
      provider_job_id,
      model_id,
    });
    //TODO: deduct balance from customer

    //   await deductBalance({
    //     customerId: customer_id,
    //     amount: model.cost_to_customer || 0,
    //     jobId: job_id,
    //   })
    //   .then((response) => (deductedCoins = model.cost_to_customer || 0));
    if (model.provider_model_type === "model") {
      console.log({
        webhook_url: `${process.env.WEBHOOK_URL}/api/webhooks/model/${job_id}`,
      });
      const response = await UROClient.runModel({
        ...validatedParams,
        model_id: model.provider_model_id,
        custom_webhook: `${process.env.WEBHOOK_URL}/api/webhooks/model/${job_id}`,
        custom_task_uuid: provider_job_id,
      });
      await jobService.processJob({
        job_id,
        provider_job_id: response.data.image_job_id,
      });
      console.log(response.data);
      if (response.data.status === "processing" || !response.data.error) {
        return {
          job_id: job_id,
          status: "processing",
        };
      } else {
        throw new ValidationError(response.data.error || "Unknown error");
      }
    } else if (model.provider_model_type === "workflow") {
      const submitData = {
        input_params: validatedParams,
        workflow_definition_id: model.provider_model_id,
        custom_webhook: `${process.env.WEBHOOK_URL}/api/webhooks/workflow/${job_id}`,
        custom_task_uuid: provider_job_id,
      };
      console.log("_____________");
      console.log(submitData);
      console.log("_____________");
      const response = await UROClient.runWorkflow(submitData);
      console.log("_____________");
      console.log(response);
      console.log("_____________");
      await jobService.processJob({
        job_id,
        provider_job_id: response.data.workflow_job_id,
      });

      if (response.data.status === "processing" || !response.data.error) {
        return {
          job_id: job_id,
          status: "processing",
        };
      } else {
        throw new ValidationError(response.data.error || "Unknown error");
      }
    }
  } catch (error) {
    if (job_id) {
      jobService.failJob({
        job_id,
        job_result: {
          error: error.message,
        },
      });
    }
    if (deductedCoins) {
      //TODO: add balance back
      // await addBalance({
      //   customerId: customer_id,
      //   amount: deductedCoins,
      //   jobId: job_id,
      // });
    }
    logger.error("runModel Error", {
      error: error.message,
      stack: error.stack,
      params: req.body,
    });
    throw error;
  }
};

/**
 *
 * @param {Object} req
 * @param {Object} req.pagination
 * @param {Object} req.query
 * @param {boolean} req.query.emptyName
 * @param {boolean} req.query.BannerAsThumbnail
 * @param {boolean} req.query.ImageTextAsThumbnail
 * @param {string[]} req.query.model_ids
 * @param {string} req.query.model_name
 * @param {string} req.query.model_type
 * @param {string} req.query.language_id
 * @param {string} req.query.category_id
 * @param {string[]} req.query.model_tag_ids
 *
 * @returns
 */
const getModels = async (req) => {
  const { page, limit, offset } = req.pagination;
  const emptyName = req.query.emptyName || false;
  const BannerAsThumbnail = req.query.BannerAsThumbnail || false;
  const ImageTextAsThumbnail = req.query.ImageTextAsThumbnail || false;
  const model_ids = req.query.model_ids || null;
  const model_name = req.query.model_name || null;
  const model_type = req.query.model_type || null;
  const language_id = req.query.language_id || null;
  const category_id = req.query.category_id || null;
  const model_tag_ids = req.query.model_tag_ids || null;
  const modelsQuery = knex("model_tr AS mt")
    .join("model AS m", "m.model_id", "mt.model_id")
    .where({ "mt.language_id": language_id || "en" })
    .select(
      "m.model_id",
      //if emptyName true make model_name a an empty string
      emptyName ? knex.raw('("") as model_name') : "mt.model_name",
      "m.model_type",
      "mt.model_description",

      "m.provider_model_type",
      "m.provider_model_id",
      "m.cost_to_customer",
      // 'cost_to_client',
      "m.created_at",
      "m.updated_at",
      "m.is_active",
      "m.deleted",
      "category_id",
      "m.model_eta"
    )
    .where({
      "m.deleted": 0,
      "m.is_active": 1,
    })
    .modify((queryBuilder) => {
      if (BannerAsThumbnail) {
        queryBuilder.select(
          "m.model_banner_thumbnail_url as model_thumbnail_url",
          knex.raw('("") as model_thumbnail_2_url')
        );
      } else if (ImageTextAsThumbnail) {
        queryBuilder.select(
          "m.model_text_thumbnail_url as model_thumbnail_url",
          knex.raw('("") as model_thumbnail_2_url')
        );
      } else {
        queryBuilder.select("m.model_thumbnail_url", "m.model_thumbnail_2_url");
      }
      if (model_ids) {
        queryBuilder.whereIn("model_id", model_ids);
      }
      if (model_name) {
        queryBuilder.where({
          "mt.model_name": model_name,
        });
      }
      if (model_type) {
        queryBuilder.where({
          "m.model_type": model_type,
        });
      }
      if (category_id) {
        queryBuilder.where({
          "m.category_id": category_id,
        });
      }
      if (model_tag_ids?.length > 0) {
        queryBuilder.leftJoin("model_tag_join AS mtj", (queryBuilder) => {
          queryBuilder.on("mtj.model_id", "m.model_id");
        });
        queryBuilder.whereIn("mtj.model_tag_id", model_tag_ids);
      }
    })
    .offset(offset)
    .limit(limit);

  const countQuery = knex("model_tr AS mt")
    .join("model AS m", "m.model_id", "mt.model_id")
    .where({ "mt.language_id": language_id || "en" })
    .select(knex.raw("count(*) as count"))
    .where({
      "m.deleted": 0,
      "m.is_active": 1,
    })

    .modify((queryBuilder) => {
      if (model_ids) {
        queryBuilder.whereIn("model_id", model_ids);
      }
      if (model_name) {
        queryBuilder.where({
          "mt.model_name": model_name,
        });
      }
      if (model_type) {
        queryBuilder.where({
          "m.model_type": model_type,
        });
      }
      if (category_id) {
        queryBuilder.where({
          "m.category_id": category_id,
        });
      }
      if (model_tag_ids?.length > 0) {
        queryBuilder.leftJoin("model_tag_join AS mtj", (queryBuilder) => {
          queryBuilder.on("mtj.model_id", "m.model_id");
        });
        queryBuilder.whereIn("mtj.model_tag_id", model_tag_ids);
      }
    })
    .first();

  const categoriesQuery = knex("category_tr")
    .select(
      "category.category_id",
      "category_tr.category_name",
      "category_tr.category_description",
      "category.category_icon_url",
      "category.category_icon_type",
      "category.is_active",
      "category.deleted"
    )
    .where({
      "category_tr.language_id": language_id || "en",
      "category.deleted": 0,
      "category.is_active": 1,
    })
    .innerJoin("category", "category.category_id", "category_tr.category_id");
  const [models, { count }, categories] = await Promise.all([
    modelsQuery,
    countQuery,
    categoriesQuery,
  ]);

  return paginated(models, page, limit, count, null, {
    categories,
  });
};

const getModel = async (req) => {
  const { model_id, language_id } = req.query;
  const [model, gallery, modelParamsConfig, tags] = await Promise.all([
    await knex("model_tr AS mt")
      .join("model AS m", "m.model_id", "mt.model_id")
      .where({ "mt.language_id": language_id || "en" })
      .select([
        "m.model_id",
        "mt.model_name",
        "m.model_type",
        "mt.model_description",
        "m.model_thumbnail_url",
        "m.model_thumbnail_2_url",
        "m.provider_model_type",
        "m.provider_model_id",
        "m.cost_to_customer",
        // 'cost_to_client',
        "m.created_at",
        "m.updated_at",
        "m.is_active",
        "m.deleted",
        "m.category_id",
        "m.model_eta",
      ])
      .where({
        "mt.model_id": model_id,
        "mt.language_id": language_id || "en",
      })
      .first(),
    knex("job")
      .where({ "job.model_id": model_id })
      .select("job_result")
      .where({
        "job.job_public": 1,
        "job.status": "completed",
        "job.deleted": 0,
      })
      .orderBy("job.created_at", "desc")
      .limit(5),
    knex("model_parameter_config_tr AS mpc_tr")
      .join(
        "model_parameter_config AS mpc",
        "mpc.model_parameter_config_id",
        "mpc_tr.model_parameter_config_id"
      )
      .where({
        "mpc_tr.language_id": language_id || "en",
        "mpc.deleted": 0,
        "mpc.model_id": model_id,
        "mpc.is_private": 0,
      })
      .select([
        "mpc.model_parameter_config_id",
        "mpc.model_id",
        "mpc_tr.parameter_title",
        "mpc.parameter_name",
        "mpc_tr.description",
        "mpc.is_private",
        "mpc.is_required",
        "mpc.data_type",
        "mpc.default_value",
        "mpc.allowed_values",
        "mpc.allowed_min_value",
        "mpc.allowed_max_value",
        "mpc.created_at",
        "mpc.updated_at",
        "mpc.deleted",
        "mpc.group_tag",
        "mpc.sort",
      ]),
    knex("model_tag_tr AS mtr")
      .join("model_tag AS mt", "mt.model_tag_id", "mtr.model_tag_id")
      .join("model_tag_join AS mtj", (queryBuilder) => {
        queryBuilder.on("mtj.model_tag_id", "mtr.model_tag_id");
      })
      .where({
        "mtj.model_id": model_id,
        "mtr.language_id": language_id || "en",
        "mt.deleted": 0,
        "mt.is_active": 1,
      })
      .select([
        "mt.model_tag_id",
        "mtr.tag_name",
        "mtr.tag_description",
        "mt.tag_image_url",
        "mt.tag_image_type",
      ]),
  ]);

  if (!model) {
    throw new Error("Model not found");
  }
  model.tags = tags;
  model.gallery = gallery.map((job) => {
    try {
      job.job_result = JSON.parse(job.job_result);
    } catch (error) {}
    if (job?.job_result?.[0]?.content_type == "image") {
      return {
        content_type: job?.job_result?.[0]?.content_type,
        content: job?.job_result?.[0]?.content,
      };
    }
  });
  //sort if null put it to end
  model.model_params_config = _.sortBy(modelParamsConfig, (param) => {
    if (param.sort === null) {
      return Infinity;
    }
    return param.sort;
  });
  return model;
};

// getModels({
//   query: {
//     language_id: 'en',
//   },
//   pagination: {
//     page: 1,
//     limit: 20,
//     offset: 0,
//   },
// }).then((models) => {
//   console.log(models);
// });

// getModel({
//   query: {
//     model_id: 1,
//     language_id: 'en',
//   },
// }).then((model) => {
//   console.log(model);
// });
// runModel({
//   body: {
//     model_id: 1,
//     params: {
//       positive_prompt: 'RED HULK',
//       steps: 25,
//     },
//   },
// }).then((response) => {
//   console.log(response);
// });

const getModelTags = async (req) => {
  const { language_id } = req.query;
  const modelTagsQuery = knex("model_tag_tr AS mtr")
    .join("model_tag AS mt", "mt.model_tag_id", "mtr.model_tag_id")
    .where({
      "mtr.language_id": language_id || "en",
      "mt.deleted": 0,
      "mt.is_active": 1,
    })
    .select([
      "mt.model_tag_id",
      "mtr.tag_name",
      "mtr.tag_description",
      "mtr.tag_headline",
      "mt.tag_image_url",
      "mt.tag_image_type",
    ]);
  const modelTags = await modelTagsQuery;
  return modelTags;
};
const modelsStore = {
  runModel,
  getModels,
  getModel,
  getModelTags,
};

module.exports = modelsStore;
