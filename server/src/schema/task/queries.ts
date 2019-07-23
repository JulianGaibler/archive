import { GraphQLFieldConfig, GraphQLList, GraphQLNonNull } from 'graphql'
import TaskModel from '../../models/Task'
import { IContext, isAuthenticated } from '../../utils'
import TaskType from './TaskType'

const tasks: GraphQLFieldConfig<any, any, any> = {
    description: `Returns a list of tasks.`,
    type: new GraphQLNonNull(new GraphQLList(new GraphQLNonNull(TaskType))),
    resolve: (parent, args, context: IContext) => {
        isAuthenticated(context)
        return TaskModel.query()
    },
}

export default {
    tasks,
}
