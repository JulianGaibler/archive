import BaseModel from './BaseModel'
import { Model } from 'objection';

export interface UniqueSettings {
    fields: string[]
    identifiers: string[]
}

export default class UniqueModel extends BaseModel {

    $unique!: UniqueSettings


    $beforeInsert(context) {
        const parent = super.$beforeInsert(context);
    
        this.checkSettings(this.$unique);
    
        return this.queryResolver(parent);
    }
    
    
    $beforeUpdate(queryOptions, context) {
        const parent = super.$beforeUpdate(queryOptions, context);
    
        this.checkSettings(this.$unique);
    
        if (!queryOptions.old || queryOptions.old.length < 1) {
            throw new Error('Unique validation at update only works with queries started with $query.');
        }
    
        return this.queryResolver(parent, true, queryOptions);
    }

    queryResolver(parent, update = false, queryOptions = {}) {
        return Promise.resolve(parent)
            .then(() => Promise.all(this.getQuery(update, queryOptions)))
            .then(rows => {

                const errors = this.parseErrors(rows);

                if (Object.keys(errors).length > 0) {
                    throw Model.createValidationError({
                        data: errors,
                        message: 'Unique Validation Failed',
                        type: 'ModelValidation'
                    });
                }
            });
    }


    getQuery(update, queryOptions) {
        return this.$unique.fields.reduce((queries, field, index) => {
            if (this[field] == null) {
                return queries;
            }

            const knex = Model.knex();
            const query = knex((this.constructor as any).tableName)
                .select()
                .where(field, this[field])
                .limit(1);

            if (update) {
                this.$unique.identifiers.forEach(identifier =>
                    query.andWhereNot(identifier, queryOptions.old[identifier])
                );
            }

            queries[index] = query;

            return queries;
        }, []);
    }

    checkSettings($unique: UniqueSettings) {
        if (!$unique || $unique.fields.length < 1 || !$unique.identifiers)
            throw new Error('Fields and identifiers options must be defined.')
    }

    parseErrors(rows) {
        return rows.reduce((errors, error, index) => {

            if (error.length > 0) {
                errors[this.$unique.fields[index]] = [{
                    keyword: 'unique',
                    message: `${this.$unique.fields[index]} already in use.`
                }];
            }
            return errors;
        }, {});
    }

}