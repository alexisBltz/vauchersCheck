'use client'
import React, { useState } from 'react';
import { Upload, AlertTriangle, Check } from 'lucide-react';
import { Alert, AlertDescription } from '@/components/ui/alert';

const VoucherUploader = () => {
    const [selectedFile, setSelectedFile] = useState(null);
    const [previewUrl, setPreviewUrl] = useState(null);
    const [extractedData, setExtractedData] = useState([]);
    const [status, setStatus] = useState({ type: '', message: '' });

    const handleFileSelect = (event) => {
        const file = event.target.files[0];
        if (file) {
            if (file.type.startsWith('image/')) {
                setSelectedFile(file);
                const reader = new FileReader();
                reader.onloadend = () => {
                    setPreviewUrl(reader.result);
                };
                reader.readAsDataURL(file);
                processVoucher(file);
            } else {
                setStatus({
                    type: 'error',
                    message: 'Error: El archivo debe ser una imagen (PNG, JPG, JPEG)'
                });
            }
        }
    };

    const processVoucher = async (file) => {
        try {
            setStatus({ type: 'loading', message: 'Procesando voucher...' });

            // Simulación de procesamiento - Reemplazar con llamada real al backend
            await new Promise(resolve => setTimeout(resolve, 1500));

            // Datos de ejemplo - Reemplazar con datos reales del backend
            const newData = {
                id: Date.now(),
                monto: '1,500.00',
                fecha: '2024-01-17',
                numeroTransaccion: Math.random().toString().slice(2, 8)
            };

            setExtractedData(prev => [...prev, newData]);
            setStatus({
                type: 'success',
                message: 'Voucher procesado exitosamente'
            });
        } catch (error) {
            setStatus({
                type: 'error',
                message: 'Error al procesar el voucher. Por favor, intente nuevamente.'
            });
        }
    };

    return (
        <div className="max-w-4xl mx-auto p-6">
        <div className="mb-8">
        <div className="flex items-center justify-center w-full">
        <label className="flex flex-col items-center justify-center w-full h-64 border-2 border-dashed rounded-lg cursor-pointer bg-gray-50 hover:bg-gray-100">
        <div className="flex flex-col items-center justify-center pt-5 pb-6">
        <Upload className="w-10 h-10 mb-3 text-gray-400" />
        <p className="mb-2 text-sm text-gray-500">
        <span className="font-semibold">Click para subir</span> o arrastre y suelte
    </p>
    <p className="text-xs text-gray-500">PNG, JPG o JPEG</p>
    </div>
    <input
    type="file"
    className="hidden"
    accept="image/*"
    onChange={handleFileSelect}
    />
    </label>
    </div>
    </div>

    {status.message && (
        <Alert className={`mb-4 ${
            status.type === 'error' ? 'bg-red-50 border-red-200' :
                status.type === 'success' ? 'bg-green-50 border-green-200' :
                    'bg-blue-50 border-blue-200'
        }`}>
        {status.type === 'error' && <AlertTriangle className="h-4 w-4 text-red-500" />}
        {status.type === 'success' && <Check className="h-4 w-4 text-green-500" />}
        <AlertDescription>{status.message}</AlertDescription>
        </Alert>
    )}

    {previewUrl && (
        <div className="mb-8">
        <h3 className="text-lg font-semibold mb-2">Vista Previa</h3>
    <img
        src={previewUrl}
        alt="Vista previa del voucher"
        className="max-w-md rounded-lg shadow-lg"
            />
            </div>
    )}

    {extractedData.length > 0 && (
        <div>
            <h3 className="text-lg font-semibold mb-4">Datos Extraídos</h3>
    <div className="overflow-x-auto">
    <table className="w-full text-sm text-left text-gray-500">
    <thead className="text-xs text-gray-700 uppercase bg-gray-100">
    <tr>
        <th className="px-6 py-3">Monto</th>
        <th className="px-6 py-3">Fecha</th>
        <th className="px-6 py-3">N° Transacción</th>
    </tr>
    </thead>
    <tbody>
    {extractedData.map((data) => (
            <tr key={data.id} className="bg-white border-b">
        <td className="px-6 py-4">S/ {data.monto}</td>
            <td className="px-6 py-4">{data.fecha}</td>
        <td className="px-6 py-4">{data.numeroTransaccion}</td>
        </tr>
    ))}
        </tbody>
        </table>
        </div>
        </div>
    )}
    </div>
);
};

export default VoucherUploader;