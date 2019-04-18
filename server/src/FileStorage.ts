import uuid from 'uuid/v4'
import jet from 'fs-jetpack'
import sharp from 'sharp'
import fileType from 'file-type'

const options = {
    dist: 'public',
    compressed: 'compressed',
    thumbnail: 'thumbnail',
    original: 'original',
}

export interface Upload {
    filename: string,
    mimetype: string,
    encoding: string,
    createReadStream: any,
}
export interface StorageInfo {
    relHeight: number,
    originalPath: string,
    compressedPath: string,
    thumbnailPath: string,
}


export async function checkFile(createReadStream) {
    return fileType.stream(createReadStream());
}

export const storeFS2 = (stream, filename, transform?) => {
    return new Promise((resolve, reject) => 
        stream()
            .pipe(transform)
            .pipe(jet.createWriteStream(filename))
            .on('error', error => reject(error))
            .on('finish', () => resolve({ filename }))
    )
}


export async function storeFile({createReadStream}: Upload) {
    return new Promise( async (resolve, reject) => {

        //const type = await checkFile(createReadStream)
        //if (type.fileType == null) throw Error('File Format not recognized')

        const filename = uuid()

        //let video = isVideo(mimetype)

        console.log("Store compressed")
        let res1 = await createCompressedImage(createReadStream, filename)
        console.log("done", res1)

        console.log("Store thumbnail")
        let res2 = await createThumbnailImage(createReadStream, filename)
        console.log("done", res2)

        //storeOriginalFile(createReadStream, filename, type.fileType)

        resolve({
            relHeight: 0,
            originalPath: 'x',
            compressedPath: 'x',
            thumbnailPath: 'x',
        })
    })
}

function storeOriginalFile(createReadStream, filename, {ext}) {
    const path = jet.path(options.dist, options.original, `${filename}.${ext}`)
    storeFS2(createReadStream, path)
}

function createCompressedImage(createReadStream, filename: string) {
    const basePipeline = () => sharp().removeAlpha().resize(900, 900, {
        fit: sharp.fit.inside,
        withoutEnlargement: true,
    })
    const exportAs = [{
        format: 'png',
        options: {
            progressive: true,

        },
    },{
        format: 'webp',
        options: {
            quality: 90,
            nearLossless: true,
        },
    }]
    let exportConfs = exportAs.map((conf) => {
        return {
            type: conf.format,
            sharp: basePipeline().toFormat(conf.format, conf.options)
        }
    })

    const dir = `${options.compressed}/${filename}`
    return saveImage(createReadStream, dir, exportConfs)
}

function createThumbnailImage(createReadStream, filename: string) {
    const basePipeline = () => sharp().removeAlpha().resize(400, 400, {
        fit: sharp.fit.inside,
        withoutEnlargement: true,
    })
    const exportAs = [{
        format: 'jpeg',
        options: {
            quality: 50,
            progressive: true,

        },
    },{
        format: 'webp',
        options: {
            quality: 50,
        },
    }]
    let exportConfs = exportAs.map((conf) => {
        return {
            type: conf.format,
            sharp: basePipeline().toFormat(conf.format, conf.options)
        }
    })

    const dir = `${options.thumbnail}/${filename}`
    return saveImage(createReadStream, dir, exportConfs)
}



async function saveImage(createReadStream, dir, exportConfs) {
    return new Promise(async resolve => {
        for (var i = exportConfs.length - 1; i >= 0; i--) {
            const filepath = `${dir}.${exportConfs[i].type}`
            await storeFS2(
                createReadStream,
                jet.path(options.dist, filepath),
                exportConfs[i].sharp
            )
        }
        resolve(dir)
    })
}


function isVideo(mimetype: String): boolean {
    let video;
    switch (mimetype.split('/')[0]) {
        case 'image':
            video = false
            break;
        case 'video':
            video = true
            break;
        default:
            throw Error('Unsupported File-Type')
    }
    return video
}