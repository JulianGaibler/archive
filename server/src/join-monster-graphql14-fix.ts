import { GraphQLObjectTypeConfig } from "graphql";
import { GraphQLObjectType as OriginalGraphQLObjectType, ThunkWithArgsCtx } from "graphql/type/definition";

interface OnlyJMGraphQLObjectTypeConfig<C> {
    alwaysFetch?: string;
    sqlTable?: ThunkWithArgsCtx<string, any, C>;
    uniqueKey?: string | string[];
}

/** MonkeyPatching GraphQLObjectType Constructor to give join monster access to config */
export class GraphQLObjectType<S, C> extends OriginalGraphQLObjectType {
    protected _typeConfig: any;

    constructor(objectTypeConfig: GraphQLObjectTypeConfig<S, C>) {
        const joinMonsterConfig: OnlyJMGraphQLObjectTypeConfig<C> = {};
        const joinMonsterKeys = ["alwaysFetch", "sqlTable", "uniqueKey"];

        for (const key of joinMonsterKeys) {
            if (key in objectTypeConfig) {
                joinMonsterConfig[key] = objectTypeConfig[key];
            }
        }

        super(objectTypeConfig);

        this._typeConfig = joinMonsterConfig;
    }
}