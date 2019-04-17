import uuid from 'uuid/v4'
import jet from 'fs-jetpack'
import sharp from 'sharp'

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


export function checkFile({mimetype, createReadStream}: Upload) {

}

export const storeFS = ({ stream, filename }) => {
    const path = `${filename}`
    return new Promise((resolve, reject) =>
        stream()
            .pipe(sharp().resize(90, 900))
            .pipe(jet.createWriteStream(path))
            .on('error', error => reject(error))
            .on('finish', () => resolve({ path }))
    )
}

export const storeFS2 = ({ stream, filename, pipe }) => {
    const path = `${filename}`
    return new Promise((resolve, reject) =>
        stream()
            .pipe(pipe)
            .pipe(jet.createWriteStream(path))
            .on('error', error => reject(error))
            .on('finish', () => resolve({ path }))
    )
}


export async function storeFile({mimetype, createReadStream}: Upload) {
    return new Promise( async (resolve, reject) => {

        const filename = uuid()

        //let video = isVideo(mimetype)

        console.log("Store compressed")
        let res1 = await createCompressedImage(createReadStream, filename)
        console.log("done", res1)

        console.log("Store thumbnail")
        let res2 = await createThumbnailImage(createReadStream, filename)
        console.log("done", res2)

        resolve({
            relHeight: 0,
            originalPath: 'x',
            compressedPath: 'x',
            thumbnailPath: 'x',
        })
    })
}

function createCompressedImage(createReadStream, filename: string) {
    const basePipeline = sharp().removeAlpha().resize(900, 900, {
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
            sharp: basePipeline.clone().toFormat(conf.format, conf.options)
        }
    })

    const dir = `${options.compressed}/${filename}`
    return saveImage(createReadStream, dir, exportConfs)
}

function createThumbnailImage(createReadStream, filename: string) {
    const basePipeline = sharp().removeAlpha().resize(400, 400, {
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
            sharp: basePipeline.clone().toFormat(conf.format, conf.options)
        }
    })

    const dir = `${options.thumbnail}/${filename}`
    return saveImage(createReadStream, dir, exportConfs)
}



async function saveImage(createReadStream, dir, exportConfs) {
    return new Promise(async resolve => {
        for (var i = exportConfs.length - 1; i >= 0; i--) {
            const filepath = `${dir}.${exportConfs[i].type}`
            await storeFS2({
                stream: createReadStream,
                filename: jet.path(options.dist, filepath),
                pipe: exportConfs[i].sharp
            })
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