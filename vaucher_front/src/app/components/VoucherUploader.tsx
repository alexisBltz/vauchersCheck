"use client"

import type React from "react"
import { useState } from "react"
import { Upload } from "lucide-react"
import { useDropzone } from "react-dropzone"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"

interface VoucherUploaderProps {
    onUpload: (file: File) => Promise<void>
}

const VoucherUploader: React.FC<VoucherUploaderProps> = ({ onUpload }) => {
    const [isUploading, setIsUploading] = useState(false)

    const onDrop = async (acceptedFiles: File[]) => {
        if (acceptedFiles.length > 0) {
            setIsUploading(true)
            await onUpload(acceptedFiles[0])
            setIsUploading(false)
        }
    }

    const { getRootProps, getInputProps, isDragActive } = useDropzone({
        onDrop,
        accept: {
            "image/*": [".png", ".jpg", ".jpeg"],
        },
        multiple: false,
    })

    return (
        <Card>
            <CardHeader>
                <CardTitle>Subir Voucher</CardTitle>
            </CardHeader>
            <CardContent>
                <div {...getRootProps()} className="border-2 border-dashed rounded-lg p-6 text-center cursor-pointer">
                    <input {...getInputProps()} />
                    <Upload className="mx-auto h-12 w-12 text-gray-400" />
                    <p className="mt-2 text-sm text-gray-500">
                        {isDragActive ? "Suelta el archivo aquí" : "Arrastra y suelta un archivo aquí, o haz clic para seleccionar"}
                    </p>
                </div>
                {isUploading && <p className="mt-2 text-sm text-gray-500">Subiendo...</p>}
            </CardContent>
        </Card>
    )
}

export default VoucherUploader