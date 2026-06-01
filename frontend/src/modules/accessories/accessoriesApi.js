import { authFetch } from "../../utils/api";

const API = import.meta.env.VITE_API_URL ?? "https://riggingcheck-production.up.railway.app";

export async function listarAcessorios() {
  const r = await authFetch(`${API}/api/acessorios`);
  if (!r.ok) throw new Error("Falha ao listar acessórios.");
  return r.json();
}

export async function buscarAcessorio(id) {
  const r = await authFetch(`${API}/api/acessorios/${id}`);
  if (!r.ok) throw new Error("Acessório não encontrado.");
  return r.json();
}

export async function criarAcessorio(data) {
  const r = await authFetch(`${API}/api/acessorios`, {
    method: "POST",
    body: JSON.stringify(data),
  });
  const body = await r.json();
  if (!r.ok) throw new Error(body.error || body.message || "Erro ao criar acessório.");
  return body;
}

export async function atualizarAcessorio(id, data) {
  const r = await authFetch(`${API}/api/acessorios/${id}`, {
    method: "PUT",
    body: JSON.stringify(data),
  });
  const body = await r.json();
  if (!r.ok) throw new Error(body.error || body.message || "Erro ao atualizar acessório.");
  return body;
}

export async function atualizarStatus(id, status, motivo) {
  const r = await authFetch(`${API}/api/acessorios/${id}/status`, {
    method: "PATCH",
    body: JSON.stringify({ status, motivo }),
  });
  const body = await r.json();
  if (!r.ok) throw new Error(body.error || body.message || "Erro ao alterar status.");
  return body;
}

export async function listarCertificados(acessorioId) {
  const r = await authFetch(`${API}/api/acessorios/${acessorioId}/certificados`);
  if (!r.ok) throw new Error("Falha ao listar certificados.");
  return r.json();
}

export async function adicionarCertificado(acessorioId, data) {
  const r = await authFetch(`${API}/api/acessorios/${acessorioId}/certificados`, {
    method: "POST",
    body: JSON.stringify(data),
  });
  const body = await r.json();
  if (!r.ok) throw new Error(body.error || body.message || "Erro ao adicionar certificado.");
  return body;
}

export async function listarInspecoes(acessorioId) {
  const r = await authFetch(`${API}/api/acessorios/${acessorioId}/inspecoes`);
  if (!r.ok) throw new Error("Falha ao listar inspeções.");
  return r.json();
}

export async function registrarInspecao(acessorioId, data) {
  const r = await authFetch(`${API}/api/acessorios/${acessorioId}/inspecoes`, {
    method: "POST",
    body: JSON.stringify(data),
  });
  const body = await r.json();
  if (!r.ok) throw new Error(body.error || body.message || "Erro ao registrar inspeção.");
  return body;
}

export async function obterQr(acessorioId) {
  const r = await authFetch(`${API}/api/acessorios/${acessorioId}/qr`);
  if (!r.ok) throw new Error("Falha ao obter QR code.");
  return r.json();
}
