import React, { useEffect, useState } from 'react';
import { fetchEsquema } from '../api';

export default function SchemaPage() {
  const [img,  setImg] = useState(null);
  const [erro, setErr] = useState(false);

  useEffect(() => {
    fetchEsquema()
      .then(blob => setImg(URL.createObjectURL(blob)))
      .catch(()   => setErr(true));
  }, []);

  return (
    <div className="p-6 space-y-6">
      <h1 className="text-2xl font-semibold">Diagrama de Esquema de Dados</h1>

      {erro      && <p className="text-red-500">Não foi possível carregar a imagem.</p>}
      {!img && !erro && <p>Carregando…</p>}

      {img && (
        <img
          src={img}
          alt="ER diagram"
          className="mx-auto max-w-full shadow rounded"
        />
      )}
    </div>
  );
}
