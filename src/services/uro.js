const { default: UroSDK, generateJobId } = require("uro-ai");
const knex = require("../configs/knex/knex");
require("dotenv").config();
const UROClient = new UroSDK({
  apiKey: process.env.URO_API_KEY,
  baseUrl: "https://client-api.xomali.ai/api",
});
//add language support for models
const translations = ["en"];

const syncUroModel = async (provider_model_id) => {
  const { data: provider_model } = await UROClient.getModelById(
    provider_model_id
  );
  console.log("model fetched");
  await knex("model")
    .insert({
      model_name: provider_model.model_name,
      model_type: provider_model.model_type,
      model_description: provider_model.model_description,
      provider_model_type: "model",
      provider_model_id: provider_model.model_id,
    })
    .then(async (e) => {
      let model_id = e[0];
      translations.forEach(async (lang) => {
        await knex("model_tr").insert({
          model_id: model_id,
          language_id: lang,
          model_name: provider_model.model_name,
          model_description: provider_model.model_description,
        });
      });
      console.log("translations inserted");
      provider_model.parameters.forEach(async (param) => {
        await knex("model_parameter_config")
          .insert({
            model_id: model_id,
            parameter_title: param.parameter_title,
            parameter_name: param.parameter_name,
            is_private: param?.is_private == 1 ? 1 : 0,
            is_required: param?.is_required == 1 ? 1 : 0,
            data_type: param.data_type,
            default_value: param?.default_value || null,
            allowed_values: param?.allowed_values || null,
            allowed_min_value: param?.allowed_min_value || null,
            allowed_max_value: param?.allowed_max_value || null,
            description: param?.description || null,
            group_tag: param?.group_tag || null,
          })
          .then(async (configIds) => {
            translations.forEach(async (lang) => {
              configIds.forEach(async (configId) => {
                await knex("model_parameter_config_tr").insert({
                  model_parameter_config_id: configId,
                  language_id: lang,
                  parameter_title: param.parameter_title,
                  description: param?.description || null,
                });
              });
            });
          });
      });
      console.log("parameters inserted");
    });
  console.log("model synced successfully");
  return provider_model;
};

const syncUroWorkflow = async (workflow_definition_id) => {
  const { data: provider_model } = await UROClient.getWorkflowById(
    workflow_definition_id
  ).catch((error) => {
    console.log(error);
  });

  /*
  {
  "workflow_definition_id": "321718f8-64a2-4638-82f3-19f1c3a2f4de",
  "name": "Generate Image with Prompt Enhancer",
  "description": "enhance a prompt then generate an image",
  "parameters": [
    {
      "workflow_parameter_config_id": 28,
      "parameter_title": "Prompt",
      "parameter_name": "prompt",
      "data_type": "string",
      "default_value": null,
      "is_required": "1",
      "allowed_values": null,
      "description": null
    },
    {
      "workflow_parameter_config_id": 34,
      "parameter_title": "Image URLs",
      "parameter_name": "image_urls",
      "data_type": "object[]",
      "default_value": null,
      "is_required": "0",
      "allowed_values": null,
      "description": null
    }
  ]
}
  */
  console.log(JSON.stringify(provider_model, null, 2));
  await knex("model")
    .insert({
      model_name: provider_model.name,
      model_type: "custom_workflow",
      model_description: provider_model.description,
      provider_model_type: "workflow",
      provider_model_id: provider_model.workflow_definition_id,
    })
    .then(async (e) => {
      let model_id = e[0];
      translations.forEach(async (lang) => {
        await knex("model_tr").insert({
          model_id: model_id,
          language_id: lang,
          model_name: provider_model.name,
          model_description: provider_model.description,
        });
      });

      provider_model.parameters.forEach(async (param) => {
        await knex("model_parameter_config")
          .insert({
            model_id: model_id,
            parameter_title: param.parameter_title,
            parameter_name: param.parameter_name,
            is_private: param?.is_private == 1 ? 1 : 0,
            is_required: param?.is_required == 1 ? 1 : 0,
            data_type: param.data_type,
            default_value: param?.default_value || null,
            allowed_values: param?.allowed_values || null,
            allowed_min_value: param?.allowed_min_value || null,
            allowed_max_value: param?.allowed_max_value || null,
            description: param?.description || null,
            group_tag: param?.group_tag || null,
          })
          .then(async (configIds) => {
            translations.forEach(async (lang) => {
              configIds.forEach(async (configId) => {
                await knex("model_parameter_config_tr").insert({
                  model_parameter_config_id: configId,
                  language_id: lang,
                  parameter_title: param.parameter_title,
                  description: param?.description || null,
                });
              });
            });
          });
      });
    });
};


const setModelCostToCustomer = async (model_id, cost) => {
  if (!model_id || !cost) {
    throw new Error("Model ID and cost are required");
  }
  return await knex("model")
    .where({ model_id })
    .update({ cost_to_customer: cost });
};

const setModelCostToClient = (model_id, cost) => {
  if (!model_id || !cost) {
    throw new Error("Model ID and cost are required");
  }
  return knex("model").where({ model_id }).update({ cost_to_client: cost });
};

// syncUroModel('6ccca57a-7415-438d-891f-17402041e462').then((model) => {
//   console.log(`Model synced successfully`);
// });
// setModelCostToCustomer(7, 0.2).then((model) => {
//   console.log(`Model cost set successfully`);
// });

module.exports = {
  UROClient,
  generateJobId,
  setModelCostToCustomer,
  setModelCostToClient,
};
