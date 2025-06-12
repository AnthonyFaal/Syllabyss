const db = require('../config/db');

class BaseRepository {
  constructor(tableName) {
    this.tableName = tableName;
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
      WHERE id = $1;
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
    const results = await this.findAll(conditions);
    return results[0] || null;
  }

  async update(id, data) {
    const keys = Object.keys(data).filter(key => data[key] !== undefined);
    const values = keys.map(key => data[key]);
    const setClause = keys.map((key, i) => `${key} = $${i + 1}`).join(', ');

    const query = `
      UPDATE ${this.tableName}
      SET ${setClause}
      WHERE id = $${keys.length + 1}
      RETURNING *;
    `;

    const result = await db.query(query, [...values, id]);
    return result.rows[0];
  }

  async delete(id) {
    const query = `
      DELETE FROM ${this.tableName}
      WHERE id = $1
      RETURNING *;
    `;
    const result = await db.query(query, [id]);
    return result.rows[0];
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

