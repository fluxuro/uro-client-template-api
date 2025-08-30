// migrations/20250830_init_schema.js
exports.up = async function (knex) {
    // category
    await knex.schema.createTable("category", (table) => {
      table.increments("category_id").primary();
      table.string("category_name");
      table.text("category_description");
      table.boolean("deleted").defaultTo(0);
      table.boolean("is_active").defaultTo(1).index();
      table.text("category_icon_url");
      table.enu("category_icon_type", ["image", "lottie"]);
    });
  
    // category_tr
    await knex.schema.createTable("category_tr", (table) => {
      table.integer("category_id").notNullable();
      table.string("language_id").notNullable();
      table.string("category_name");
      table.string("category_description");
      table.primary(["category_id", "language_id"]);
    });
  
    // job
    await knex.schema.createTable("job", (table) => {
      table.increments("job_id").unsigned().primary();
      table.integer("customer_id").index();
      table.string("model_id").index();
      table.string("provider_job_id");
      table.enu("provider_job_type", ["model", "workflow"]);
      table.integer("user_id").index();
      table.text("job_input_params");
      table.text("job_result");
      table
        .enu("status", ["pending", "processing", "completed", "failed"])
        .notNullable()
        .defaultTo("pending");
      table.timestamp("processing_at");
      table.timestamp("completed_at");
      table.timestamp("failed_at");
      table.timestamp("created_at").defaultTo(knex.fn.now());
      table.double("cost_to_client");
      table.double("cost_to_customer");
      table.boolean("deleted").defaultTo(0);
      table.boolean("job_public").defaultTo(0);
    });
  
    // model
    await knex.schema.createTable("model", (table) => {
      table.increments("model_id").primary();
      table.string("provider_model_id");
      table.string("model_name");
      table.text("model_description");
      table.text("model_thumbnail_url");
      table.text("model_thumbnail_2_url");
      table.text("model_text_thumbnail_url");
      table.text("model_banner_thumbnail_url");
      table.string("model_type").index();
      table.integer("category_id").index();
      table.enu("provider_model_type", ["model", "workflow"]);
      table.double("cost_to_customer");
      table.double("cost_to_client");
      table.timestamp("created_at").defaultTo(knex.fn.now());
      table
        .datetime("updated_at")
        .defaultTo(knex.raw("CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP"));
      table.boolean("is_active").defaultTo(1).index();
      table.boolean("deleted").defaultTo(0);
      table.integer("model_eta").defaultTo(0);
    });
  
    // model_parameter_config
    await knex.schema.createTable("model_parameter_config", (table) => {
      table.increments("model_parameter_config_id").primary();
      table.uuid("model_id").notNullable().index();
      table.string("parameter_title");
      table.text("description");
      table.string("parameter_name").notNullable();
      table.boolean("is_private").defaultTo(0);
      table.boolean("is_required").notNullable().defaultTo(0);
      table
        .enu("data_type", [
          "float",
          "string",
          "integer",
          "object",
          "object[]",
          "boolean",
        ])
        .notNullable()
        .defaultTo("string");
      table.text("default_value");
      table.text("allowed_values");
      table.integer("allowed_min_value");
      table.integer("allowed_max_value");
      table.timestamp("created_at").defaultTo(knex.fn.now());
      table
        .datetime("updated_at")
        .defaultTo(knex.raw("CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP"));
      table.boolean("deleted").defaultTo(0);
      table.string("group_tag");
      table.integer("sort");
    });
  
    // model_parameter_config_tr
    await knex.schema.createTable("model_parameter_config_tr", (table) => {
      table.integer("model_parameter_config_id").notNullable();
      table.string("language_id").notNullable();
      table.string("parameter_title");
      table.text("description");
      table.primary(["model_parameter_config_id", "language_id"]);
      table.index(["language_id"]);
    });
  
    // model_tag
    await knex.schema.createTable("model_tag", (table) => {
      table.increments("model_tag_id").primary();
      table.string("tag_name");
      table.string("tag_description");
      table.string("tag_headline");
      table.string("tag_image_url");
      table.enu("tag_image_type", ["image", "lottie", "icon"]).defaultTo("image");
      table.boolean("deleted").defaultTo(0);
      table.boolean("is_active").defaultTo(1).index();
    });
  
    // model_tag_join
    await knex.schema.createTable("model_tag_join", (table) => {
      table.integer("model_tag_id").notNullable();
      table.integer("model_id").notNullable();
      table.primary(["model_tag_id", "model_id"]);
    });
  
    // model_tag_tr
    await knex.schema.createTable("model_tag_tr", (table) => {
      table.integer("model_tag_id").notNullable();
      table.string("language_id").notNullable();
      table.string("tag_name");
      table.string("tag_description");
      table.string("tag_headline");
      table.primary(["model_tag_id", "language_id"]);
    });
  
    // model_tr
    await knex.schema.createTable("model_tr", (table) => {
      table.integer("model_id").notNullable();
      table.string("language_id").notNullable();
      table.string("model_name");
      table.string("model_description");
      table.primary(["model_id", "language_id"]);
    });
  
    // user_image
    await knex.schema.createTable("user_image", (table) => {
      table.increments("user_image_id").unsigned().primary();
      table.integer("user_id").index();
      table.string("image_url");
    });
  };
  
  exports.down = async function (knex) {
    await knex.schema.dropTableIfExists("user_image");
    await knex.schema.dropTableIfExists("model_tr");
    await knex.schema.dropTableIfExists("model_tag_tr");
    await knex.schema.dropTableIfExists("model_tag_join");
    await knex.schema.dropTableIfExists("model_tag");
    await knex.schema.dropTableIfExists("model_parameter_config_tr");
    await knex.schema.dropTableIfExists("model_parameter_config");
    await knex.schema.dropTableIfExists("model");
    await knex.schema.dropTableIfExists("job");
    await knex.schema.dropTableIfExists("category_tr");
    await knex.schema.dropTableIfExists("category");
  };
  