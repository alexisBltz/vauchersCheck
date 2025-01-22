'use client'
import type React from "react"
import { useState} from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Button } from "@/components/ui/button"
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogHeader,
    DialogTitle,
    DialogTrigger,
} from "@/components/ui/dialog"
import {
    Pagination,
    PaginationContent,
    PaginationItem,
    PaginationLink,
    PaginationNext,
    PaginationPrevious,
} from "@/components/ui/pagination"

interface VoucherData {
    id: number
    imageUrl: string
    extractedData: {
        amount?: number
        transactionDate?: string
        transactionNumber?: string
        merchantName?: string
        currency?: string
        totalAmount?: number
        taxAmount?: number
        items?: Array<{
            description: string
            quantity: number
            unitPrice: number
            totalPrice: number
        }>
    }
    createdAt: string
    status: boolean
}

interface VoucherHistoryListProps {
    vouchers: VoucherData[]
    itemsPerPage: number
}

const VoucherHistoryList: React.FC<VoucherHistoryListProps> = ({ vouchers, itemsPerPage }) => {
    const [currentPage, setCurrentPage] = useState(1)
    const [selectedVoucher, setSelectedVoucher] = useState<VoucherData | null>(null)

    const indexOfLastItem = currentPage * itemsPerPage
    const indexOfFirstItem = indexOfLastItem - itemsPerPage
    const currentVouchers = vouchers.slice(indexOfFirstItem, indexOfLastItem)

    const totalPages = Math.ceil(vouchers.length / itemsPerPage)

    const handlePageChange = (pageNumber: number) => {
        setCurrentPage(pageNumber)
    }

    return (
        <Card>
            <CardHeader>
                <CardTitle>Historial de Vouchers</CardTitle>
            </CardHeader>
            <CardContent>
                <Table>
                    <TableHeader>
                        <TableRow>
                            <TableHead>ID</TableHead>
                            <TableHead>Comerciante</TableHead>
                            <TableHead>Monto</TableHead>
                            <TableHead>Fecha</TableHead>
                            <TableHead>Acciones</TableHead>
                        </TableRow>
                    </TableHeader>
                    <TableBody>
                        {currentVouchers.map((voucher) => (
                            <TableRow key={voucher.id}>
                                <TableCell>{voucher.id}</TableCell>
                                <TableCell>{voucher.extractedData.merchantName || "N/A"}</TableCell>
                                <TableCell>
                                    {voucher.extractedData.amount
                                        ? `${voucher.extractedData.amount} ${voucher.extractedData.currency || ""}`
                                        : "N/A"}
                                </TableCell>
                                <TableCell>{voucher.extractedData.transactionDate || "N/A"}</TableCell>
                                <TableCell>
                                    <Dialog>
                                        <DialogTrigger asChild>
                                            <Button variant="outline" size="sm" onClick={() => setSelectedVoucher(voucher)}>
                                                Ver detalles
                                            </Button>
                                        </DialogTrigger>
                                        <DialogContent className="max-w-3xl">
                                            <DialogHeader>
                                                <DialogTitle>Detalles del Voucher</DialogTitle>
                                                <DialogDescription>
                                                    Información completa del voucher ID: {selectedVoucher?.id}
                                                </DialogDescription>
                                            </DialogHeader>
                                            {selectedVoucher && (
                                                <div className="grid gap-4">
                                                    <img
                                                        src={selectedVoucher.imageUrl || "/placeholder.svg"}
                                                        alt="Voucher"
                                                        className="max-w-full h-auto rounded-lg shadow-lg"
                                                    />
                                                    <div className="grid grid-cols-2 gap-4">
                                                        <div>
                                                            <h4 className="font-semibold mb-2">Información General</h4>
                                                            <dl className="grid grid-cols-2 gap-2">
                                                                <dt className="text-sm font-medium">Comerciante:</dt>
                                                                <dd className="text-sm">{selectedVoucher.extractedData.merchantName || "N/A"}</dd>
                                                                <dt className="text-sm font-medium">Monto:</dt>
                                                                <dd className="text-sm">
                                                                    {selectedVoucher.extractedData.amount
                                                                        ? `${selectedVoucher.extractedData.amount} ${selectedVoucher.extractedData.currency || ""}`
                                                                        : "N/A"}
                                                                </dd>
                                                                <dt className="text-sm font-medium">Fecha:</dt>
                                                                <dd className="text-sm">{selectedVoucher.extractedData.transactionDate || "N/A"}</dd>
                                                                <dt className="text-sm font-medium">N° Transacción:</dt>
                                                                <dd className="text-sm">{selectedVoucher.extractedData.transactionNumber || "N/A"}</dd>
                                                                <dt className="text-sm font-medium">Monto Total:</dt>
                                                                <dd className="text-sm">
                                                                    {selectedVoucher.extractedData.totalAmount
                                                                        ? `${selectedVoucher.extractedData.totalAmount} ${selectedVoucher.extractedData.currency || ""}`
                                                                        : "N/A"}
                                                                </dd>
                                                                <dt className="text-sm font-medium">Impuesto:</dt>
                                                                <dd className="text-sm">
                                                                    {selectedVoucher.extractedData.taxAmount
                                                                        ? `${selectedVoucher.extractedData.taxAmount} ${selectedVoucher.extractedData.currency || ""}`
                                                                        : "N/A"}
                                                                </dd>
                                                            </dl>
                                                        </div>
                                                        {selectedVoucher.extractedData.items && selectedVoucher.extractedData.items.length > 0 && (
                                                            <div>
                                                                <h4 className="font-semibold mb-2">Artículos</h4>
                                                                <Table>
                                                                    <TableHeader>
                                                                        <TableRow>
                                                                            <TableHead>Descripción</TableHead>
                                                                            <TableHead>Cant.</TableHead>
                                                                            <TableHead>P.Unit</TableHead>
                                                                            <TableHead>Total</TableHead>
                                                                        </TableRow>
                                                                    </TableHeader>
                                                                    <TableBody>
                                                                        {selectedVoucher.extractedData.items.map((item, index) => (
                                                                            <TableRow key={index}>
                                                                                <TableCell>{item.description}</TableCell>
                                                                                <TableCell>{item.quantity}</TableCell>
                                                                                <TableCell>{item.unitPrice}</TableCell>
                                                                                <TableCell>{item.totalPrice}</TableCell>
                                                                            </TableRow>
                                                                        ))}
                                                                    </TableBody>
                                                                </Table>
                                                            </div>
                                                        )}
                                                    </div>
                                                </div>
                                            )}
                                        </DialogContent>
                                    </Dialog>
                                </TableCell>
                            </TableRow>
                        ))}
                    </TableBody>
                </Table>
                <Pagination className="mt-4">
                    <PaginationContent>
                        <PaginationItem>
                            <PaginationPrevious onClick={() => handlePageChange(currentPage - 1)} />
                        </PaginationItem>
                        {[...Array(totalPages)].map((_, index) => (
                            <PaginationItem key={index}>
                                <PaginationLink onClick={() => handlePageChange(index + 1)} isActive={currentPage === index + 1}>
                                    {index + 1}
                                </PaginationLink>
                            </PaginationItem>
                        ))}
                        <PaginationItem>
                            <PaginationNext onClick={() => handlePageChange(currentPage + 1)}  />
                        </PaginationItem>
                    </PaginationContent>
                </Pagination>
            </CardContent>
        </Card>
    )
}

export default VoucherHistoryList

