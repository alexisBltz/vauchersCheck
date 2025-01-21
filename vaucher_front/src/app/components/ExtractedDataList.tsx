import type React from "react"
import { useState } from "react"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogHeader,
    DialogTitle,
    DialogTrigger,
} from "@/components/ui/dialog"

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
}

interface ExtractedDataListProps {
    data: ExtractedData[]
}

const ExtractedDataList: React.FC<ExtractedDataListProps> = ({ data }) => {
    const [, setSelectedVoucher] = useState<ExtractedData | null>(null)

    if (data.length === 0) return null

    return (
        <Card>
            <CardHeader>
                <CardTitle>Vouchers Guardados</CardTitle>
            </CardHeader>
            <CardContent>
                <Table>
                    <TableHeader>
                        <TableRow>
                            <TableHead>Comerciante</TableHead>
                            <TableHead>Monto</TableHead>
                            <TableHead>Fecha</TableHead>
                            <TableHead>Número de Transacción</TableHead>
                            <TableHead>Acciones</TableHead>
                        </TableRow>
                    </TableHeader>
                    <TableBody>
                        {data.map((voucher) => (
                            <TableRow key={voucher.id}>
                                <TableCell>{voucher.merchantName}</TableCell>
                                <TableCell>
                                    {voucher.amount} {voucher.currency}
                                </TableCell>
                                <TableCell>{voucher.transactionDate}</TableCell>
                                <TableCell>{voucher.transactionNumber}</TableCell>
                                <TableCell>
                                    <Dialog>
                                        <DialogTrigger asChild>
                                            <Button variant="outline" size="sm" onClick={() => setSelectedVoucher(voucher)}>
                                                Más detalles
                                            </Button>
                                        </DialogTrigger>
                                        <DialogContent className="max-w-3xl">
                                            <DialogHeader>
                                                <DialogTitle>Detalles del Voucher</DialogTitle>
                                                <DialogDescription>
                                                    Información completa del voucher de {voucher.merchantName}
                                                </DialogDescription>
                                            </DialogHeader>
                                            <div className="grid gap-4 py-4">
                                                <div className="grid grid-cols-2 gap-4">
                                                    <div>
                                                        <h4 className="font-semibold mb-2">Información General</h4>
                                                        <dl className="grid grid-cols-2 gap-2">
                                                            <dt className="text-sm font-medium">Comerciante:</dt>
                                                            <dd className="text-sm">{voucher.merchantName}</dd>
                                                            <dt className="text-sm font-medium">Monto:</dt>
                                                            <dd className="text-sm">
                                                                {voucher.amount} {voucher.currency}
                                                            </dd>
                                                            <dt className="text-sm font-medium">Fecha:</dt>
                                                            <dd className="text-sm">{voucher.transactionDate}</dd>
                                                            <dt className="text-sm font-medium">N° Transacción:</dt>
                                                            <dd className="text-sm">{voucher.transactionNumber}</dd>
                                                            <dt className="text-sm font-medium">Monto Total:</dt>
                                                            <dd className="text-sm">
                                                                {voucher.totalAmount} {voucher.currency}
                                                            </dd>
                                                            <dt className="text-sm font-medium">Impuesto:</dt>
                                                            <dd className="text-sm">
                                                                {voucher.taxAmount} {voucher.currency}
                                                            </dd>
                                                        </dl>
                                                    </div>
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
                                                                {voucher.items.map((item, index) => (
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
                                                </div>
                                            </div>
                                        </DialogContent>
                                    </Dialog>
                                </TableCell>
                            </TableRow>
                        ))}
                    </TableBody>
                </Table>
            </CardContent>
        </Card>
    )
}

export default ExtractedDataList

