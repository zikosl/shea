import { extendType, arg, nonNull } from 'nexus';
import * as fs from 'fs';
import { UPLOAD_DIR } from '../../utils/const';
import * as path from 'path';
import { GraphQLError } from 'graphql'




const Mutation = extendType({
    type: 'Mutation',
    definition(t) {
        t.field('uploadFile', {
            type: 'FileUploadResponse',
            args: {
                file: nonNull(arg({ type: 'File' })),
            },
            resolve: async (_, { file }: { file: File }) => {
                const filename = `${Date.now()}-${file.name}`
                try {
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
                    url: `/${filename}`, // Adjust this based on your server setup
                };
            },
        });
    },
});

export default {
    Mutation
}
