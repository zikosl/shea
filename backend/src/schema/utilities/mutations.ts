import { extendType, arg, nonNull } from 'nexus';
import * as fs from 'fs';
import { UPLOAD_DIR } from '../../utils/const';
import * as path from 'path';
import { GraphQLError } from 'graphql'

function sanitizeFilename(filename: string) {
    return filename.replace(/[^a-zA-Z0-9._-]/g, '-')
}



const Mutation = extendType({
    type: 'Mutation',
    definition(t) {
        t.field('uploadFile', {
            type: 'FileUploadResponse',
            args: {
                file: nonNull(arg({ type: 'File' })),
            },
            resolve: async (_, { file }: { file: File }) => {
                const filename = `${Date.now()}-${sanitizeFilename(file.name)}`
                try {
                    await fs.promises.mkdir(UPLOAD_DIR, { recursive: true })
                    const fileArrayBuffer = await file.arrayBuffer()
                    await fs.promises.writeFile(
                        path.join(UPLOAD_DIR, filename),
                        Buffer.from(fileArrayBuffer),
                    )
                } catch (e) {
                    throw new GraphQLError("nothing uploaded")
                }
                return {
                    filename: file.name,
                    mimetype: file.type,
                    encoding: 'binary',
                    url: `/uploads/${filename}`,
                };
            },
        });
    },
});

export default {
    Mutation
}
