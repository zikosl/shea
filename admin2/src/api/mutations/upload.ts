import { gql } from "graphql-request"


export const FILE_UPLOAD = gql`
    mutation uploadFile($file:File!) {
        uploadFile(file: $file) {
            filename
            mimetype
            encoding
            url
        }
    }
`