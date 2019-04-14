import { Model, RelationMappings } from 'objection';

export default class BaseModel extends Model {

    updatedAt!: Date;
    createdAt!: Date;

    $beforeInsert() {
        this.createdAt = new Date();
        this.updatedAt = new Date();
    }

    $beforeUpdate() {
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