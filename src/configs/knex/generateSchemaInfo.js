/**
 * Database Schema Information Generator
 *
 * This script queries the database to extract table and column information,
 * then generates a Markdown file with the schema details.
 * This helps AI assistants like Cascade have better context about the database structure.
 */

const fs = require('fs');
const path = require('path');
const knex = require('./knex');

// Output file path
const OUTPUT_FILE = path.join(__dirname, '../../../db-schema-info.md');

async function generateSchemaInfo() {
  try {
    console.log('Generating database schema information...');

    // Get the database name
    const [dbInfoResult] = await knex.raw('SELECT DATABASE() as dbName');
    const dbName = dbInfoResult[0].dbName;
    console.log(`Database name: ${dbName}`);

    // Get all tables in the database
    const tablesResult = await knex.raw(
      "SELECT table_name FROM information_schema.tables WHERE table_schema = ? AND table_type = 'BASE TABLE' ORDER BY table_name",
      [dbName]
    );

    // Extract table names correctly from the result
    const tables = tablesResult[0].map(
      (row) => row.TABLE_NAME || row.table_name
    );
    console.log(`Found ${tables.length} tables: ${tables.join(', ')}`);

    // Initialize markdown content
    let markdown = `# Database Schema Information\n\n`;
    markdown += `Database: **${dbName}**\n\n`;
    markdown += `Generated on: ${new Date().toISOString()}\n\n`;
    markdown += `## Tables\n\n`;

    // Process each table
    for (const tableName of tables) {
      console.log(`Processing table: ${tableName}`);

      // Get column information for the table
      const columnsResult = await knex.raw(
        `SELECT 
          column_name, 
          column_type,
          is_nullable,
          column_key,
          column_default,
          extra
        FROM information_schema.columns 
        WHERE table_schema = ? AND table_name = ? 
        ORDER BY ordinal_position`,
        [dbName, tableName]
      );

      const columns = columnsResult[0];

      // Add table header to markdown
      markdown += `### ${tableName}\n\n`;

      // Create table of columns
      markdown += `| Column | Type | Nullable | Key | Default | Extra |\n`;
      markdown += `|--------|------|----------|-----|---------|-------|\n`;

      // Add each column
      columns.forEach((column) => {
        const columnName = column.COLUMN_NAME || column.column_name;
        const columnType = column.COLUMN_TYPE || column.column_type;
        const isNullable = column.IS_NULLABLE || column.is_nullable;
        const columnKey = column.COLUMN_KEY || column.column_key || '';
        const columnDefault =
          (column.COLUMN_DEFAULT !== undefined
            ? column.COLUMN_DEFAULT
            : column.column_default) !== null
            ? column.COLUMN_DEFAULT || column.column_default
            : '';
        const extra = column.EXTRA || column.extra || '';

        markdown += `| ${columnName} | ${columnType} | ${isNullable} | ${columnKey} | ${columnDefault} | ${extra} |\n`;
      });

      markdown += '\n';

      // Get foreign key information
      const foreignKeysResult = await knex.raw(
        `SELECT
          constraint_name,
          column_name,
          referenced_table_name,
          referenced_column_name
        FROM information_schema.key_column_usage
        WHERE table_schema = ?
          AND table_name = ?
          AND referenced_table_name IS NOT NULL`,
        [dbName, tableName]
      );

      const foreignKeys = foreignKeysResult[0];

      // Add foreign keys to markdown if they exist
      if (foreignKeys.length > 0) {
        markdown += `#### Foreign Keys\n\n`;
        markdown += `| Constraint | Column | Referenced Table | Referenced Column |\n`;
        markdown += `|------------|--------|------------------|-------------------|\n`;

        foreignKeys.forEach((fk) => {
          const constraintName = fk.CONSTRAINT_NAME || fk.constraint_name;
          const columnName = fk.COLUMN_NAME || fk.column_name;
          const referencedTable =
            fk.REFERENCED_TABLE_NAME || fk.referenced_table_name;
          const referencedColumn =
            fk.REFERENCED_COLUMN_NAME || fk.referenced_column_name;

          markdown += `| ${constraintName} | ${columnName} | ${referencedTable} | ${referencedColumn} |\n`;
        });

        markdown += '\n';
      }

      try {
        // Get indexes for the table
        const indexesResult = await knex.raw(
          `SHOW INDEX FROM \`${tableName}\``,
          []
        );

        const indexes = indexesResult[0];

        // Add indexes to markdown if they exist
        if (indexes.length > 0) {
          markdown += `#### Indexes\n\n`;
          markdown += `| Key Name | Column | Non Unique | Type |\n`;
          markdown += `|----------|--------|------------|------|\n`;

          indexes.forEach((idx) => {
            markdown += `| ${idx.Key_name} | ${idx.Column_name} | ${idx.Non_unique} | ${idx.Index_type} |\n`;
          });

          markdown += '\n';
        }
      } catch (indexError) {
        console.log(
          `Could not fetch indexes for table ${tableName}: ${indexError.message}`
        );
      }
    }

    // Write markdown to file
    fs.writeFileSync(OUTPUT_FILE, markdown);

    console.log(`Schema information generated successfully at: ${OUTPUT_FILE}`);
  } catch (error) {
    console.error('Error generating schema information:', error);
  } finally {
    // Close the database connection
    await knex.destroy();
  }
}

// Run the function
generateSchemaInfo();
