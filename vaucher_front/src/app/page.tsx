"use client"

import React, { useState, useEffect } from "react"
import VoucherUploader from "@/app/components/VoucherUploader"
import ExtractedDataList from "@/app/components/ExtractedDataList"
import VoucherReview from "@/app/components/VoucherReview"
import StatusMessage from "@/app/components/StatusMessage"
import VoucherHistoryList from "@/app/components/VoucherHistoryList"

interface ExtractedData {
  id?: string
  amount: number
  transactionDate: string
  transactionNumber: string
  merchantName: string
  items: Array<{
    description: string
    quantity: number
    unitPrice: number
    totalPrice: number
  }>
  totalAmount: number
  taxAmount: number
  currency: string
  imageUrl?: string
}

interface VoucherData {
  id: number
  imageUrl: string
  extractedData: ExtractedData
  createdAt: string
  status: boolean
}

const API_URL = "https://4ba9-2800-200-ff30-a7-34a0-22ae-98e8-83be.ngrok-free.app/"

export default function Home() {
  const [status, setStatus] = useState<{ type: "success" | "error" | "loading" ; message: string }>({
    type: "loading",
    message: "",
  })
  const [extractedData, setExtractedData] = useState<ExtractedData[]>([])
  const [pendingVoucher, setPendingVoucher] = useState<ExtractedData | null>(null)
  const [voucherHistory, setVoucherHistory] = useState<VoucherData[]>([])

  useEffect(() => {
    fetchVoucherHistory()
  }, [])

  const fetchVoucherHistory = async () => {
    try {
      const response = await fetch(`${API_URL}vouchers`)
      const data = await response.json()
      if (data.status === "success") {
        setVoucherHistory(data.data)
      } else {
        throw new Error(data.message || "Error al cargar el historial de vouchers")
      }
    } catch (error) {
      setStatus({
        type: "error",
        message: error instanceof Error ? error.message : "Error desconocido al cargar el historial",
      })
    }
  }

  const handleUpload = async (file: File) => {
    try {
      setStatus({ type: "loading", message: "Subiendo imagen..." })

      // Subir imagen
      const formData = new FormData()
      formData.append("file", file)
      const uploadResponse = await fetch(`${API_URL}vouchers/upload`, {
        method: "POST",
        body: formData,
      })
      const uploadData = await uploadResponse.json()

      if (uploadData.status !== "success") {
        throw new Error("Error al subir la imagen")
      }

      setStatus({ type: "loading", message: "Extrayendo datos..." })

      // Extraer datos
      const extractResponse = await fetch(`${API_URL}vouchers/extract`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ imageUrl: uploadData.imageUrl }),
      })
      const extractData = await extractResponse.json()

      if (extractData.status !== "success") {
        throw new Error("Error al extraer los datos")
      }

      // Set pending voucher
      setPendingVoucher({
        ...extractData.data,
        imageUrl: uploadData.imageUrl,
        id: Date.now().toString(), // Temporary ID
      })

      setStatus({ type: "success", message: "Datos extraídos. Por favor, revise y guarde." })
    } catch (error) {
      setStatus({ type: "error", message: error instanceof Error ? error.message : "Error desconocido" })
    }
  }

  const handleSave = async (voucherData: ExtractedData) => {
    try {
      setStatus({ type: "loading", message: "Guardando datos..." })

      const saveResponse = await fetch(`${API_URL}vouchers/save`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          imageUrl: voucherData.imageUrl,
          extractedData: voucherData,
        }),
      })
      const saveData = await saveResponse.json()

      if (saveData.status !== "success") {
        throw new Error(saveData.message || "Error al guardar los datos")
      }

      setExtractedData((prevData) => [...prevData, voucherData])
      setPendingVoucher(null)
      setStatus({ type: "success", message: "Voucher guardado exitosamente" })
      fetchVoucherHistory() // Actualizar el historial después de guardar
    } catch (error) {
      setStatus({ type: "error", message: error instanceof Error ? error.message : "Error desconocido" })
    }
  }

  const handleDiscard = () => {
    setPendingVoucher(null)
    setStatus({ type: "loading", message: "" })
  }

  return (
      <main className="container mx-auto p-4">
        <h1 className="text-2xl font-bold mb-6 text-center">Sistema de Procesamiento de Vouchers</h1>
        <div className="grid gap-6">
          <VoucherUploader onUpload={handleUpload} />
          {status.message && <StatusMessage type={status.type} message={status.message} />}
          {pendingVoucher && <VoucherReview voucherData={pendingVoucher} onSave={handleSave} onDiscard={handleDiscard} />}
          <ExtractedDataList data={extractedData} />
          <VoucherHistoryList vouchers={voucherHistory} itemsPerPage={5} />
        </div>
      </main>
  )
}
