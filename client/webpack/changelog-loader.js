const spawn = require('cross-spawn')
const YAML = require('yaml')
const { DateTime } = require('luxon')

const captureRegex = /\[(.*?)\]\s(.*?)(?:\s-\s#(.*?))?$/

module.exports = function(source) {
    this.cacheable && this.cacheable()
    let value = YAML.parse(source)

    const tagsWithDate = getGitTagsWithDate()

    value = Object.keys(value).map(key => ({
        version: key,
        changes: formatChanges(value[key]),
        date: tagsWithDate[key] ? DateTime.fromJSDate(new Date(tagsWithDate[key])).toFormat('DDD') : undefined,
    }))
    return 'module.exports = ' + JSON.stringify(value, undefined, '\t')
}

function formatChanges(changes) {
    return changes.map(change => {
        const res = captureRegex.exec(change)
        return {
            label: res[1],
            message: res[2],
            issue: res[3],
        }
    })
}

function getGitTagsWithDate() {
    let lastUpdated = {}
    try {
        spawn.sync(
            'git',
            [
                'for-each-ref',
                '--format=%(refname:short)~%(creatordate)',
                'refs/tags/*',
            ])
            .stdout
            .toString('utf-8')
            .split('\n')
            .filter(line => line.length > 0)
            .forEach(line => {
                const components = line.split('~')
                lastUpdated[components[0].substring(1)] = components[1]
            })

    } catch (e) {
        // Don't handle that (for now?)
        return {}
    }
    return lastUpdated
}
