import { Model, RelationMappings } from 'objection';
import uuid from 'uuid/v4'

export default class BaseModel extends Model {

    updatedAt!: Date;
    createdAt!: Date;

    $beforeInsert(context) {
        const parent = super.$beforeInsert(context);

        return Promise.resolve(parent)
        .then(
            () =>
                this['id'] || uuid()
        )
        .then(guid => {
            this.createdAt = new Date();
            this.updatedAt = new Date();
            this['id'] = guid;
        });
    }

    $beforeUpdate(queryOptions, context) {
        this.updatedAt = new Date();
    }

    $parseDatabaseJson(json: object) {
        json = super.$parseDatabaseJson(json);
        toDate(json, 'createdAt');
        toDate(json, 'updatedAt');
        return json;
    }

    $formatDatabaseJson(json: object) {
        json = super.$formatDatabaseJson(json);
        toTime(json, 'createdAt');
        toTime(json, 'updatedAt');
        return json;
    }
}

function toDate(obj: any, fieldName: string): any {
    if (obj != null && typeof obj[fieldName] === 'number') {
        obj[fieldName] = new Date(obj[fieldName]);
    }
    return obj;
}

function toTime(obj: any, fieldName: string): any {
    if (obj != null && obj[fieldName] != null && obj[fieldName].getTime) {
        obj[fieldName] = obj[fieldName].getTime();
    }
    return obj;
}