import React from 'react';
import schemaImg from '../assets/schema.png'; // local asset (no fetch)

export default function SchemaPage() {
  return (
    <div className="p-6 flex flex-col items-center space-y-6">
      <h1 className="text-2xl font-semibold">Esquema de Dados</h1>

      {/* diagram straight from /assets/ */}
      <img
        src={schemaImg}
        alt="Diagrama do banco de dados"
        className="max-w-full rounded-lg shadow-md"
      />

      <p className="max-w-2xl text-sm text-gray-600">
        O diagrama acima faz parte dos assets do frontend, portanto é servido
        diretamente pelo Vite (ou Nginx em produção) sem chamadas adicionais à API.
      </p>
    </div>
  );
}
