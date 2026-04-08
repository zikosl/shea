import { objectType, scalarType } from 'nexus'

const FileScalar = scalarType({
    name: 'File',
    asNexusMethod: 'file',
    description: 'The `File` scalar type represents a file upload.',
    sourceType: 'File'
})

const FileUploadResponse = objectType({
    name: 'FileUploadResponse',
    definition(t) {
        t.nonNull.string('filename');
        t.nonNull.string('mimetype');
        t.nonNull.string('encoding');
        t.nonNull.string('url');
    },
});

export default {
    FileUploadResponse,
    FileScalar
}
