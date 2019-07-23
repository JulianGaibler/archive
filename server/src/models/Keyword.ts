import DataLoader from 'dataloader'
import { Model, RelationMappings } from 'objection'
import { ModelId } from '../utils/modelEnum'
import UniqueModel from './UniqueModel'

import Post from './Post'

export default class Keyword extends UniqueModel {
    static tableName = 'Keyword'
    static readonly modelId = ModelId.KEYWORD

    $unique = {
        fields: ['name'],
        identifiers: ['id'],
    }

    readonly id!: number
    name!: string
    posts!: Post[]

    static async keywordsByIds(keywordIds: number[]): Promise<Keyword[]> {
        const keyword = await Keyword.query().findByIds(keywordIds)

        const keywordMap: { [key: string]: Keyword } = {}
        keyword.forEach(kw => {
            keywordMap[kw.id] = kw
        })

        return keywordIds.map(id => keywordMap[id])
    }

    static async keywordsByPost(postIds: number[]): Promise<Keyword[][]> {
        const posts: any = await Post.query()
            .findByIds(postIds)
            .select('Post.id', 'keywords')
            .eagerAlgorithm(Post.JoinEagerAlgorithm)
            .eager('keywords')

        const postMap: { [key: string]: any } = {}
        posts.forEach(post => {
            postMap[post.id] = post
        })

        return postIds.map(id => (postMap[id] ? postMap[id].keywords : []))
    }

    static getLoaders() {
        const getById = new DataLoader<number, Keyword>(this.keywordsByIds)
        const getByPost = new DataLoader<number, Keyword[]>(this.keywordsByPost)

        return { getById, getByPost }
    }

    static jsonSchema = {
        type: 'object',
        required: ['name'],

        properties: {
            id: { type: 'number' },
            name: { type: 'string', minLength: 2, maxLength: 64 },
        },
    }

    static modelPaths = [__dirname]

    static relationMappings: RelationMappings = {
        posts: {
            relation: Model.ManyToManyRelation,
            modelClass: 'Post',
            join: {
                from: 'Keyword.id',
                through: {
                    from: 'KeywordToPost.keyword_id',
                    to: 'KeywordToPost.post_id',
                },
                to: 'Post.id',
            },
        },
    }
}
