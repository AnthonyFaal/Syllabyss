const db = require('../config/db');

class BaseRepository {
  constructor(tableName, key = 'id') {
    this.tableName = tableName;
    this.Key = key;
  }
 
  async create(data) {
    const keys = Object.keys(data);
    const values = Object.values(data);
    const placeholders = keys.map((_, i) => `$${i + 1}`).join(', ');
    const columns = keys.join(', ');

    const query = `
      INSERT INTO ${this.tableName} (${columns})
      VALUES (${placeholders})
      RETURNING *;
    `;

    const result = await db.query(query, values);
    return result.rows[0];
  }

  async getById(id) {
    const query = `
      SELECT * FROM ${this.tableName}
      WHERE ${this.Key} = $1;
    `;
    const result = await db.query(query, [id]);
    return result.rows[0];
  }

  async getAll(conditions = {}) {
    let query = `SELECT * FROM ${this.tableName}`;
    const values = [];
    const whereClauses = [];

    Object.entries(conditions).forEach(([key, value], index) => {
      if (value !== undefined && value !== null) {
        whereClauses.push(`${key} = $${index + 1}`);
        values.push(value); 
      }
    });

    if (whereClauses.length > 0) {
      query += ` WHERE ${whereClauses.join(' AND ')}`;
    }

    const result = await db.query(query, values);
    return result.rows;
  }

  async getByName(name) {
    const query = `
      SELECT * FROM ${this.tableName}
      WHERE name = $1;
    `;
    const result = await db.query(query, [name]);
    return result.rows;
  }

 async getOne(conditions = {}) {
  const results = await this.getAll(conditions);
  return results[0] || null;
}

  async update(id, data) {
     const keys = Object.keys(data).filter(key => data[key] !== undefined);
    const values = keys.map(key => data[key]);
    const setClause = keys.map((key, i) => `${key} = $${i + 1}`).join(', ');

    const query = `
      UPDATE ${this.tableName}
      SET ${setClause}
      WHERE ${this.Key} = $${keys.length + 1}
      RETURNING *;
    `;

    const result = await db.query(query, [...values, id]);
    return result.rows[0];
  }
 
  // In BaseRepository class
 async getWhere(conditions = {}) {
    let query = `SELECT * FROM ${this.tableName}`;
    const values = [];
    const whereClauses = [];
    let paramIndex = 1;

    Object.entries(conditions).forEach(([key, value]) => {
      if (value === undefined || value === null) return;

      // Handle $in operator for array values
      if (typeof value === 'object' && value.$in) {
        if (value.$in.length === 0) {
          // Handle empty array case
          whereClauses.push('1 = 0'); // Always false
          return;
        }
        const placeholders = value.$in.map((_, i) => `$${paramIndex + i}`).join(',');
        whereClauses.push(`${key} IN (${placeholders})`);
        values.push(...value.$in);
        paramIndex += value.$in.length;
      } else {
        // Standard equality condition
        whereClauses.push(`${key} = $${paramIndex}`);
        values.push(value);
        paramIndex += 1;
      }
    });

    if (whereClauses.length > 0) {
      query += ` WHERE ${whereClauses.join(' AND ')}`;
    }

    const result = await db.query(query, values);
    return result.rows;
  }

  async delete(id) {
    const query = `
      DELETE FROM ${this.tableName}
      WHERE ${this.Key} = $1
      RETURNING *;
    `;
    const result = await db.query(query, [id]);
    return result.rows[0];
  }
  
async deleteWhere(column, values, extraConditions = {}) {
  if (!values || values.length === 0) {
    console.log(`⚠️ deleteWhere called with empty values`);
    return [];
  }

  // Debug: Log the actual parameters
  console.log('DELETE PARAMS:', {
    table: this.tableName,
    column,
    values,
    extraConditions
  });

  const baseIndex = Object.keys(extraConditions).length;
  const inPlaceholders = values.map((_, i) => `$${i + 1}`).join(", ");
  const extraClauses = [];
  const queryParams = [...values];

  Object.entries(extraConditions).forEach(([key, value], i) => {
    extraClauses.push(`${key} = $${baseIndex + i + 1}`);
    queryParams.push(value);
  });

  let query = `
    DELETE FROM ${this.tableName}
    WHERE ${column} IN (${inPlaceholders})
  `;
  
  if (extraClauses.length > 0) {
    query += ` AND ${extraClauses.join(" AND ")}`;
  }

  query += ' RETURNING *;';

  // Debug: Log the final query
  console.log('FINAL DELETE QUERY:', query);
  console.log('QUERY PARAMS:', queryParams);

  const result = await db.query(query, queryParams);
  
  // Debug: Log the actual database response
  console.log('DELETE RESULT:', result.rows);
  
  return result.rows;
}

 async deleteAll(conditions = {}) {
    let query = `DELETE FROM ${this.tableName}`;
    const values = [];
    const whereClauses = [];

    Object.entries(conditions).forEach(([key, value], index) => {
      if (value !== undefined && value !== null) {
        whereClauses.push(`${key} = $${index + 1}`);
        values.push(value);
      }
    });

    if (whereClauses.length > 0) {
      query += ` WHERE ${whereClauses.join(' AND ')}`;
    }

    // For PostgreSQL, you might want to add RETURNING * to get deleted rows
    query += ' RETURNING *;';

    const result = await db.query(query, values);
    return result.rows;
  }

  async count(conditions = {}) {
    let query = `SELECT COUNT(*) FROM ${this.tableName}`;
    const values = [];
    const whereClauses = [];
 
    Object.entries(conditions).forEach(([key, value], index) => {
      if (value !== undefined && value !== null) {
        whereClauses.push(`${key} = $${index + 1}`);
        values.push(value);
      }
    });

    if (whereClauses.length > 0) {
      query += ` WHERE ${whereClauses.join(' AND ')}`;
    }

    const result = await db.query(query, values);
    return parseInt(result.rows[0].count, 10);
  }
 
  async rawQuery(query, params = []) {
  const result = await db.query(query, params);
  return result.rows;
  }

  // Add this method to your BaseRepository class
async upsert(data, conflictTarget, updateColumns = []) {
  const keys = Object.keys(data);
  const values = Object.values(data);
  const placeholders = keys.map((_, i) => `$${i + 1}`).join(', ');
  const columns = keys.join(', ');

  let query;

  if (updateColumns.length === 0) {
    // Insert and do nothing if conflict
    query = `
      INSERT INTO ${this.tableName} (${columns})
      VALUES (${placeholders})
      ON CONFLICT (${conflictTarget}) DO NOTHING
      RETURNING *;
    `;
  } else {
    // Insert and update on conflict
    const setClause = updateColumns
      .map(col => `${col} = EXCLUDED.${col}`)
      .join(', ');

    query = `
      INSERT INTO ${this.tableName} (${columns})
      VALUES (${placeholders})
      ON CONFLICT (${conflictTarget}) DO UPDATE 
      SET ${setClause}
      RETURNING *;
    `;
  }

  const result = await db.query(query, values);
  return result.rows[0];
}

// Add this method for increment operations
async increment(id, increments) {
  const keys = Object.keys(increments);
  const values = [];
  const clauses = [];

  keys.forEach((key, i) => {
    const value = increments[key];
    // If value is a Date or ISO string, treat it as direct assignment
    if (value instanceof Date || typeof value === 'string' && !isNaN(Date.parse(value))) {
      clauses.push(`${key} = $${i + 1}`);
    } else {
      clauses.push(`${key} = ${key} + $${i + 1}`);
    }
    values.push(value);
  });

  const query = `
    UPDATE ${this.tableName}
    SET ${clauses.join(', ')}
    WHERE ${this.Key} = $${values.length + 1}
    RETURNING *;
  `;

  const result = await db.query(query, [...values, id]);
  return result.rows[0];
}

// Add this to your BaseRepository class
async getWhereIn(column, values = []) {
  if (!values || values.length === 0) return [];

  const placeholders = values.map((_, i) => `$${i + 1}`).join(', ');
  const query = `SELECT * FROM ${this.tableName} WHERE ${column} IN (${placeholders})`;

  const result = await db.query(query, values);
  return result.rows;
}


  // In BaseRepository class
async joinTables({
  mainTableAlias = 'main',
  joinTables = [],
  selectFields = ['main.*'],
  conditions = {},
  orderBy = '',
  limit = null,
  offset = null
}) {
  // Build SELECT clause
  const selectClause = selectFields.join(', ');

  // Build FROM clause with main table
  let fromClause = `FROM ${this.tableName} AS ${mainTableAlias}`;

  // Build JOIN clauses
  const joinClauses = joinTables.map(join => {
    const {
      table,
      alias,
      on,
      type = 'LEFT' // Default to LEFT JOIN
    } = join;
    return `${type} JOIN ${table} AS ${alias} ON ${on}`;
  }).join(' ');

  // Build WHERE clause
  const whereClauses = [];
  const values = [];
  let paramIndex = 1;

  Object.entries(conditions).forEach(([key, value]) => {
    if (value === undefined || value === null) return;

    // Handle different comparison operators
    if (typeof value === 'object' && !Array.isArray(value)) {
      // Handle operators like $eq, $ne, $gt, etc.
      Object.entries(value).forEach(([operator, opValue]) => {
        const operators = {
          $eq: '=',
          $ne: '!=',
          $gt: '>',
          $gte: '>=',
          $lt: '<',
          $lte: '<=',
          $like: 'LIKE',
          $in: 'IN'
        };

        if (operators[operator]) {
          if (operator === '$in' && Array.isArray(opValue)) {
            if (opValue.length === 0) {
              whereClauses.push('1 = 0'); // Always false for empty IN
              return;
            }
            const placeholders = opValue.map((_, i) => `$${paramIndex + i}`).join(',');
            whereClauses.push(`${key} IN (${placeholders})`);
            values.push(...opValue);
            paramIndex += opValue.length;
          } else {
            whereClauses.push(`${key} ${operators[operator]} $${paramIndex}`);
            values.push(opValue);
            paramIndex += 1;
          }
        }
      });
    } else {
      // Standard equality condition
      whereClauses.push(`${key} = $${paramIndex}`);
      values.push(value);
      paramIndex += 1;
    }
  });

  let whereClause = '';
  if (whereClauses.length > 0) {
    whereClause = `WHERE ${whereClauses.join(' AND ')}`;
  }

  // Build ORDER BY clause
  let orderByClause = '';
  if (orderBy) {
    orderByClause = `ORDER BY ${orderBy}`;
  }

  // Build LIMIT and OFFSET clauses
  let limitOffsetClause = '';
  if (limit !== null) {
    limitOffsetClause = `LIMIT $${paramIndex}`;
    values.push(limit);
    paramIndex += 1;
    
    if (offset !== null) {
      limitOffsetClause += ` OFFSET $${paramIndex}`;
      values.push(offset);
    }
  }

  const query = `
    SELECT ${selectClause}
    ${fromClause}
    ${joinClauses}
    ${whereClause}
    ${orderByClause}
    ${limitOffsetClause};
  `;

  const result = await db.query(query, values);
  return result.rows;
} 

  async paginate({ page = 1, limit = 10, conditions = {} }) {
    const offset = (page - 1) * limit;
    let query = `SELECT * FROM ${this.tableName}`;
    const values = [];
    const whereClauses = [];

    Object.entries(conditions).forEach(([key, value], index) => {
      if (value !== undefined && value !== null) {
        whereClauses.push(`${key} = $${index + 1}`);
        values.push(value);
      }
    });

    if (whereClauses.length > 0) {
      query += ` WHERE ${whereClauses.join(' AND ')}`;
    }

    query += ` LIMIT $${values.length + 1} OFFSET $${values.length + 2}`;
    const result = await db.query(query, [...values, limit, offset]);
    
    const total = await this.count(conditions);
    const totalPages = Math.ceil(total / limit);

    return {
      data: result.rows,
      pagination: {
        total,
        totalPages,
        currentPage: page,
        limit,
        hasNextPage: page < totalPages,
        hasPreviousPage: page > 1,
      }
    };
  }
}

module.exports = BaseRepository;

