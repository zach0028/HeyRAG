"use client";
import {useState, useEffect } from "react";
//useState va permettre d'actualiser le statut de la variable "status" une fois que la réponse API arrive
//useEffect : c'est parce qu'on aime pas attendre ; le navigateur va afficher l'état immédiatement et useEffect lance le fetch en arrière plan
export default function Home() {
  const [status, setStatus] = useState<string>("attends un peu, ça charge ...");
  //

  useEffect(() => {
    fetch("http://localhost:8000/health")
    .then((res) => res.json())
    .then((data) => setStatus(data.status))
    .catch(() => setStatus("error"));
  },[]);

  return(
    <main style={{ padding: "2rem"}}>
      <h1>HeyRAG</h1>
      <p>Backend status: {status}</p>
    </main>
  );

}
