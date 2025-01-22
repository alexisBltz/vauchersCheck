"use client"

import type React from "react"
import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { AlertCircle, Plus, Trash2 } from "lucide-react"

interface Item {
    description: string
    quantity: number
    unitPrice: number
    totalPrice: number
}

interface ExtractedData {
    id?: string
    amount: number
    transactionDate: string
    transactionNumber: string
    merchantName: string
    items: Item[]
    totalAmount: number
    taxAmount: number
    currency: string
    imageUrl?: string
}

interface VoucherReviewProps {
    voucherData: ExtractedData
    onSave: (data: ExtractedData) => void
    onDiscard: () => void
}

const VoucherReview: React.FC<VoucherReviewProps> = ({ voucherData, onSave, onDiscard }) => {
    const [editedData, setEditedData] = useState<ExtractedData>(voucherData)
    const [error, setError] = useState<string | null>(null)
    const [newItem, setNewItem] = useState<Item>({
        description: "",
        quantity: 0,
        unitPrice: 0,
        totalPrice: 0,
    })

    const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const { name, value } = e.target
        if (name.startsWith("items.")) {
            // eslint-disable-next-line @typescript-eslint/no-unused-vars
            const [_, index, field] = name.split(".")
            const idx = Number.parseInt(index)
            const updatedItems = [...editedData.items]
            updatedItems[idx] = {
                ...updatedItems[idx],
                [field]: field === "description" ? value : Number(value),
                totalPrice:
                    field === "quantity"
                        ? Number(value) * updatedItems[idx].unitPrice
                        : field === "unitPrice"
                            ? updatedItems[idx].quantity * Number(value)
                            : updatedItems[idx].totalPrice,
            }
            setEditedData((prev) => ({
                ...prev,
                items: updatedItems,
                totalAmount: updatedItems.reduce((sum, item) => sum + item.totalPrice, 0),
            }))
        } else {
            setEditedData((prev) => ({
                ...prev,
                [name]: name === "amount" || name === "totalAmount" || name === "taxAmount" ? Number(value) : value,
            }))
        }
    }

    const validateFields = (): boolean => {
        if (!editedData.merchantName.trim()) {
            setError("El campo 'Comerciante' es obligatorio.")
            return false
        }
        if (!editedData.transactionDate.trim()) {
            setError("El campo 'Fecha de Transacción' es obligatorio.")
            return false
        }
        if (!editedData.transactionNumber.trim()) {
            setError("El campo 'Número de Transacción' es obligatorio.")
            return false
        }
        if (editedData.amount <= 0) {
            setError("El campo 'Monto' debe ser mayor a 0.")
            return false
        }
        setError(null)
        return true
    }

    const handleAddItem = () => {
        if (!newItem.description) {
            setError("La descripción del artículo es obligatoria")
            return
        }
        const itemToAdd = {
            ...newItem,
            totalPrice: newItem.quantity * newItem.unitPrice,
        }
        setEditedData((prev) => ({
            ...prev,
            items: [...prev.items, itemToAdd],
            totalAmount: prev.totalAmount + itemToAdd.totalPrice,
        }))
        setNewItem({
            description: "",
            quantity: 0,
            unitPrice: 0,
            totalPrice: 0,
        })
        setError(null)
    }

    const handleRemoveItem = (index: number) => {
        setEditedData((prev) => {
            const updatedItems = prev.items.filter((_, idx) => idx !== index)
            return {
                ...prev,
                items: updatedItems,
                totalAmount: updatedItems.reduce((sum, item) => sum + item.totalPrice, 0),
            }
        })
    }

    const handleSave = () => {
        if (validateFields()) {
            onSave(editedData)
        }
    }

    return (
        <Card>
            <CardHeader>
                <CardTitle>Revisar y Editar Datos del Voucher</CardTitle>
            </CardHeader>
            <CardContent>
                <div className="grid gap-4">
                    {error && (
                        <Alert variant="destructive">
                            <AlertCircle className="h-4 w-4" />
                            <AlertDescription>{error}</AlertDescription>
                        </Alert>
                    )}
                    <div>
                        <Label htmlFor="merchantName">Comerciante *</Label>
                        <Input
                            id="merchantName"
                            name="merchantName"
                            value={editedData.merchantName}
                            onChange={handleInputChange}
                            required
                        />
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                        <div>
                            <Label htmlFor="amount">Monto *</Label>
                            <Input
                                id="amount"
                                name="amount"
                                type="number"
                                value={editedData.amount}
                                onChange={handleInputChange}
                                required
                            />
                        </div>
                        <div>
                            <Label htmlFor="currency">Moneda</Label>
                            <Input id="currency" name="currency" value={editedData.currency} onChange={handleInputChange} />
                        </div>
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                        <div>
                            <Label htmlFor="transactionDate">Fecha de Transacción *</Label>
                            <Input
                                id="transactionDate"
                                name="transactionDate"
                                value={editedData.transactionDate}
                                onChange={handleInputChange}
                                required
                            />
                        </div>
                        <div>
                            <Label htmlFor="transactionNumber">Número de Transacción *</Label>
                            <Input
                                id="transactionNumber"
                                name="transactionNumber"
                                value={editedData.transactionNumber}
                                onChange={handleInputChange}
                                required
                            />
                        </div>
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                        <div>
                            <Label htmlFor="totalAmount">Monto Total</Label>
                            <Input
                                id="totalAmount"
                                name="totalAmount"
                                type="number"
                                value={editedData.totalAmount}
                                onChange={handleInputChange}
                            />
                        </div>
                        <div>
                            <Label htmlFor="taxAmount">Impuesto</Label>
                            <Input
                                id="taxAmount"
                                name="taxAmount"
                                type="number"
                                value={editedData.taxAmount}
                                onChange={handleInputChange}
                            />
                        </div>
                    </div>

                    <div className="border-t pt-4">
                        <Label>Artículos</Label>
                        <div className="space-y-2">
                            {editedData.items.map((item, index) => (
                                <div key={index} className="grid grid-cols-12 gap-2 items-center">
                                    <div className="col-span-4">
                                        <Input
                                            name={`items.${index}.description`}
                                            value={item.description}
                                            onChange={handleInputChange}
                                            placeholder="Descripción"
                                        />
                                    </div>
                                    <div className="col-span-2">
                                        <Input
                                            type="number"
                                            name={`items.${index}.quantity`}
                                            value={item.quantity}
                                            onChange={handleInputChange}
                                            placeholder="Cantidad"
                                        />
                                    </div>
                                    <div className="col-span-2">
                                        <Input
                                            type="number"
                                            name={`items.${index}.unitPrice`}
                                            value={item.unitPrice}
                                            onChange={handleInputChange}
                                            placeholder="Precio Unit."
                                        />
                                    </div>
                                    <div className="col-span-3">
                                        <Input type="number" value={item.totalPrice} readOnly placeholder="Total" />
                                    </div>
                                    <div className="col-span-1">
                                        <Button variant="destructive" size="icon" onClick={() => handleRemoveItem(index)}>
                                            <Trash2 className="h-4 w-4" />
                                        </Button>
                                    </div>
                                </div>
                            ))}

                            <div className="grid grid-cols-12 gap-2 items-center">
                                <div className="col-span-4">
                                    <Input
                                        value={newItem.description}
                                        onChange={(e) => setNewItem((prev) => ({ ...prev, description: e.target.value }))}
                                        placeholder="Descripción"
                                    />
                                </div>
                                <div className="col-span-2">
                                    <Input
                                        type="number"
                                        value={newItem.quantity}
                                        onChange={(e) => setNewItem((prev) => ({ ...prev, quantity: Number(e.target.value) }))}
                                        placeholder="Cantidad"
                                    />
                                </div>
                                <div className="col-span-2">
                                    <Input
                                        type="number"
                                        value={newItem.unitPrice}
                                        onChange={(e) => setNewItem((prev) => ({ ...prev, unitPrice: Number(e.target.value) }))}
                                        placeholder="Precio Unit."
                                    />
                                </div>
                                <div className="col-span-3">
                                    <Input type="number" value={newItem.quantity * newItem.unitPrice} readOnly placeholder="Total" />
                                </div>
                                <div className="col-span-1">
                                    <Button variant="outline" size="icon" onClick={handleAddItem}>
                                        <Plus className="h-4 w-4" />
                                    </Button>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </CardContent>
            <CardFooter className="flex justify-between">
                <Button variant="outline" onClick={onDiscard}>
                    Descartar
                </Button>
                <Button onClick={handleSave}>Guardar</Button>
            </CardFooter>
        </Card>
    )
}

export default VoucherReview

