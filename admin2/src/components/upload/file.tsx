
// import { router, usePage } from "@inertiajs/react"
// import { Dialog, DialogContent, DialogDescription, DialogTitle } from "../ui/dialog"
// import { DialogHeader } from "../ui/dialog"


// import { Dispatch, SetStateAction, useState } from "react"
// import { useUploadFile } from "@/hooks/use-upload-file"
// import { FileUploader } from "../folder/file"
// import { Space } from "@/data/schema"
// import { __ } from "@/lib/lang"


// export function DialogUploader({ open, setOpen }: { open: boolean, setOpen: Dispatch<SetStateAction<boolean>> }) {

//     const { folder_id, space } = usePage<{
//         folder_id: number,
//         space?: Space
//     }>().props

//     const [_, setFiles] = useState<File[]>([])
//     const { uploadFiles, progresses, isUploading } = useUploadFile(
//         space ? route("client.drive.file.store", space.id) : route("client.drive.file.store"),
//         folder_id
//     )

//     return (
//         <Dialog open={open} onOpenChange={(e) => {
//             if (!e) {
//                 router.reload()
//             }
//             setOpen(e)
//         }}>
//             <DialogContent className="sm:max-w-xl">
//                 <DialogHeader>
//                     <DialogTitle>
//                         {__("Upload files")}
//                     </DialogTitle>
//                     <DialogDescription>
//                         {__("Drag and drop your files here or click to browse.")}
//                     </DialogDescription>
//                 </DialogHeader>
//                 <FileUploader
//                     maxFiles={8}
//                     maxSize={25 * 1024 * 1024}
//                     onValueChange={setFiles}
//                     progresses={progresses}
//                     onUpload={uploadFiles}
//                     disabled={isUploading}
//                 />
//             </DialogContent>
//         </Dialog>
//     )
// }