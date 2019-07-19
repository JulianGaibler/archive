const files = require.context('.', false, /\.js$/)
const modules = {}
const plugins = []

files.keys().forEach(key => {
	if (key === './index.js') return
	modules[key.replace(/(\.\/|\.js)/g, '')] = files(key)._modules
})

export { modules, plugins }
