import * as React from "react"
import { toast } from "sonner"

import { getErrorMessage } from "@/lib/handle-error"
import axios from "axios"
import { endpoint } from "@/constant"



export function useUploadFile(
  REQUEST: string,
) {
  const [uploadedFiles, setUploadedFiles] =
    React.useState<any[]>([])
  const [progresses, setProgresses] = React.useState<Record<string, number>>({})
  const [isUploading, setIsUploading] = React.useState(false)

  async function uploadThings(files: any[]) {
    setIsUploading(true)
    try {
      for (let index = 0; index < files.length; index++) {
        const formData = new FormData();
        formData.append('operations', JSON.stringify({
          query: REQUEST,
          variables: {
            file: null
          }
        }));
        formData.append('map', JSON.stringify({
          '0': ['variables.file']
        }));

        let file = files[index]
        formData.append('0', file);
        const res = await axios.post(endpoint,
          formData
          , {
            headers: {
              'Content-Type': 'multipart/form-data'
            },
            onUploadProgress: event => {
              if (event.lengthComputable) {
                setProgresses((prev) => {
                  let total = event?.total ?? event.loaded
                  return {
                    ...prev,
                    [file.name]: event.loaded / total * 100,
                  }
                })
              }

            }
          })
        if (res.data.errors) {
          throw new Error(res.data.errors[0].message)
        }
        else {
          setUploadedFiles([...uploadedFiles, res.data.data.uploadFile])
        }
      }
    } catch (err) {
      toast.error(getErrorMessage(err))
    } finally {
      setProgresses({})
      setIsUploading(false)
    }
  }

  return {
    uploadedFiles,
    progresses,
    uploadFiles: uploadThings,
    isUploading,
  }
}