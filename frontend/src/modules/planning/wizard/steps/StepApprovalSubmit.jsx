/**
 * Etapa 7 — Envio para Aprovação.
 * Reaproveita a lógica de solicitarLiberacao do TabChecklist:
 * OS pré-preenchida do planData, mesmo POST /api/liberacoes, mesmo polling.
 */

import { useState, useEffect } from "react";
import { getUser, authFetch } from "../../../../utils/api";

const API = import.meta.env.VITE_API_URL ?? "https://riggingcheck-production.up.railway.app";

const S = {
  card:  { background: "#1e293b", borderRadius: 12, padding: 24, marginBottom: 16, border: "1px solid #334155" },
  label: { display: "block", fontSize: 11, color: "#64748b", letterSpacing: 1, textTransform: "uppercase", marginBottom: 6 },
  input: { width: "100%", boxSizing: "border-box", background: "#0f172a", border: "1px solid #334155", borderRadius: 8, color: "#e2e8f0", fontSize: 15, padding: "10px 14px" },
  row:   { display: "flex", justifyContent: "space-between", padding: "6px 0", borderBottom: "1px solid #1e293b", fontSize: 13 },
};

function SummaryRow({ label, value, color }) {
  if (!value && value !== 0) return null;
  return (
    <div style={S.row}>
      <span style={{ color: "#64748b" }}>{label}</span>
      <span style={{ color: color || "#e2e8f0", fontWeight: 500 }}>{value}</span>
    </div>
  );
}

export default function StepApprovalSubmit({ planData, onSave }) {
  const user = getUser();

  const [jobId,      setJobId]      = useState(planData.operacaoOs || "");
  const [solicitacao, setSolicitacao] = useState(planData._solicitacao || null);
  const [polling,    setPolling]    = useState(false);
  const [loading,    setLoading]    = useState(false);
  const [error,      setError]      = useState(null);

  useEffect(() => {
    if (!polling || !solicitacao) return;
    if (solicitacao.status !== "ANALISAR") { setPolling(false); return; }
    const timer = setInterval(async () => {
      try {
        const r = await authFetch(`${API}/api/liberacoes/${solicitacao.id}`);
        const d = await r.json();
        setSolicitacao(d);
        onSave("_solicitacao", d);
        if (d.status !== "ANALISAR") setPolling(false);
      } catch { /* ignora erros de rede no polling */ }
    }, 5000);
    return () => clearInterval(timer);
  }, [polling, solicitacao]); // eslint-disable-line react-hooks/exhaustive-deps

  const solicitarLiberacao = async () => {
    if (!jobId.trim()) { setError("Preencha o número da OS."); return; }
    setLoading(true); setError(null);
    try {
      const ug = planData?.utilizacaoGuindaste;
      const cb = planData?.cargaBruta;
      const te = planData?.tensao;

      const dadosCapacidade = {
        capGuindasteKg:  ug?.capacidade   ?? null,
        capCargaKg:      cb?.inputs?.liq  ?? ug?.cargaTotal ?? null,
        capAparelhoKg:   cb?.inputs
          ? (Number(cb.inputs.esl || 0) + Number(cb.inputs.man || 0) + Number(cb.inputs.disp || 0))
          : null,
        capTotalKg:      ug?.cargaTotal   ?? cb?.total ?? null,
        capUsoPercent:   ug?.pct          ?? null,
        capRisco:        ug?.risk         ?? null,
      };

      const dadosEslinga = {
        eslNumPernas:           te?.inputs?.pernas  ? parseInt(te.inputs.pernas)    : null,
        eslAnguloGraus:         te?.inputs?.angulo  ? parseFloat(te.inputs.angulo)  : null,
        eslTensaoPorPernaKg:    te?.tensao           ?? null,
        eslFatorCarga:          te?.mult             ?? null,
        eslRisco:               te?.status           ?? null,
        eslAnguloAviso:         te?.inputs?.angulo   ? parseFloat(te.inputs.angulo) < 45 : null,
        eslWllKg:               te?.wll              ?? null,
        eslWllUsoPercent:       te?.taxa             ?? null,
        eslTemManilha:          false,
        eslManilhaCapacidadeKg: null,
        eslManilhaUsoPercent:   null,
        eslManilhaCompativel:   null,
      };

      // Acessórios selecionados no Wizard
      const acessorios = (planData.acessoriosSelecionados ?? []).map(a => ({
        acessorioId: a.id,
      }));

      // Dados operacionais completos do Wizard
      const dadosOperacionais = {
        localOperacao:      planData.localOperacao   || null,
        dataOperacao:       planData.dataOperacao    || null,
        supervisorNome:     planData.supervisorNome  || null,
        descricaoAtividade: planData.observacoes     || null,
      };

      // Checklist: ler do localStorage e mapear contra os itens definidos
      const checklistState = (() => {
        try { return JSON.parse(localStorage.getItem("rc_checklist_campo") || "{}"); } catch { return {}; }
      })();
      const CHECKLIST_CAMPO = [
        { id:"c1",  cat:"Guindastes & Solo",     item:"Estabilidade das esteiras/sapatas verificada" },
        { id:"c2",  cat:"Guindastes & Solo",     item:"Laudo de compactação do solo disponível" },
        { id:"c3",  cat:"Guindastes & Solo",     item:"Pressão das patolas calculada e dentro do limite do solo" },
        { id:"c4",  cat:"Guindastes & Solo",     item:"Pranchas de distribuição dimensionadas e posicionadas" },
        { id:"c5",  cat:"Equipamentos",          item:"Condições gerais do guindaste verificadas" },
        { id:"c6",  cat:"Equipamentos",          item:"Condições do moitão e cabos de içamento verificadas" },
        { id:"c7",  cat:"Equipamentos",          item:"Tabela de carga em poder do operador" },
        { id:"c8",  cat:"Equipamentos",          item:"Raio real medido na trena ≤ raio planejado" },
        { id:"c9",  cat:"Acessórios",            item:"Eslingas/cintas sem fios rompidos ou cortes" },
        { id:"c10", cat:"Acessórios",            item:"Todos acessórios com TAG e certificado de teste (12 meses)" },
        { id:"c11", cat:"Acessórios",            item:"Manilhas e ganchos sem pintura (que oculta trincas)" },
        { id:"c12", cat:"Acessórios",            item:"Relação D/d verificada (dano por curvatura excessiva)" },
        { id:"c13", cat:"Pessoal & Comunicação", item:"Nível de experiência do operador compatível com o equipamento" },
        { id:"c14", cat:"Pessoal & Comunicação", item:"Nível de experiência do sinaleiro" },
        { id:"c15", cat:"Pessoal & Comunicação", item:"Supervisor experiente presente no local" },
        { id:"c16", cat:"Pessoal & Comunicação", item:"Sistema de comunicação (rádio) testado" },
        { id:"c17", cat:"Ambiente",              item:"Velocidade do vento < 45 km/h (boletim climático)" },
        { id:"c18", cat:"Ambiente",              item:"Verificação do subsolo (galerias, fundações, envelopes)" },
        { id:"c19", cat:"Ambiente",              item:"Redes elétricas na proximidade verificadas" },
        { id:"c20", cat:"Ambiente",              item:"Linha de fogo (área de giro e queda) isolada e sinalizada" },
        { id:"c21", cat:"N-2869 — Petrobras",   item:"Plano de içamento elaborado e aprovado pela supervisão" },
        { id:"c22", cat:"N-2869 — Petrobras",   item:"APR preenchida e assinada por todos os envolvidos" },
        { id:"c23", cat:"N-2869 — Petrobras",   item:"Zona de exclusão delimitada conforme plano" },
        { id:"c24", cat:"N-2869 — Petrobras",   item:"Para içamento crítico: Rigger Nível 3 designado e presente" },
        { id:"c25", cat:"N-2869 — Petrobras",   item:"Certificados de calibração dos equipamentos de monitoração vigentes" },
        { id:"c26", cat:"N-2869 — Petrobras",   item:"Plano de contingência discutido com toda a equipe" },
      ];
      const checklistItens = CHECKLIST_CAMPO.map(it => ({
        codigoItem:    it.id,
        categoriaItem: it.cat,
        perguntaItem:  it.item,
        respondido:    !!checklistState[it.id],
      }));

      // Dados Petrobras como JSON
      const petrobrasDataJson = planData.petrobrasData
        ? JSON.stringify(planData.petrobrasData)
        : null;

      const res = await authFetch(`${API}/api/liberacoes`, {
        method: "POST",
        body: JSON.stringify({
          operacaoOs:  jobId.trim(),
          riggerNome:  planData.riggerNome || user?.userName || "—",
          dadosCapacidade,
          dadosEslinga,
          acessorios,
          dadosOperacionais,
          checklistItens,
          petrobrasDataJson,
        }),
      });
      const data = await res.json();
      if (!res.ok) { setError(data.error || data.message || "Erro ao enviar."); return; }
      setSolicitacao(data);
      onSave("_solicitacao", data);
      onSave("operacaoOs", jobId.trim());
      setPolling(true);
    } catch { setError("Não foi possível conectar à API."); }
    finally  { setLoading(false); }
  };

  const novaOperacao = () => {
    setSolicitacao(null);
    onSave("_solicitacao", null);
    setError(null);
  };

  const { cargaBruta, utilizacaoGuindaste, tensao, checklistProgresso } = planData;
  const fmt = (v, d = 1) => v != null ? Number(v).toLocaleString("pt-BR", { maximumFractionDigits: d }) : "—";

  return (
    <div>
      <div style={{ marginBottom: 20 }}>
        <h2 style={{ color: "#f1f5f9", margin: "0 0 4px", fontSize: 18, fontWeight: 700 }}>📤 Envio para Aprovação</h2>
        <p style={{ color: "#64748b", margin: 0, fontSize: 13 }}>
          Revise o resumo técnico e envie o plano para autorização do Líder ou Administrador.
        </p>
      </div>

      {/* Resumo técnico */}
      <div style={S.card}>
        <div style={{ fontSize: 12, color: "#38bdf8", fontWeight: 700, letterSpacing: 1, textTransform: "uppercase", marginBottom: 12 }}>
          Resumo do Plano
        </div>
        <SummaryRow label="OS" value={planData.operacaoOs || "—"} />
        <SummaryRow label="Operador" value={planData.riggerNome || user?.userName || "—"} />
        <SummaryRow label="Local" value={planData.localOperacao} />
        <SummaryRow label="Data" value={planData.dataOperacao} />
        {cargaBruta && (
          <>
            <SummaryRow label="Carga bruta" value={`${fmt(cargaBruta.total, 0)} kg`} />
            <SummaryRow label="Içamento" value={cargaBruta.n2869 ? "Crítico ≥ 20 t" : "Normal < 20 t"} color={cargaBruta.n2869 ? "#f59e0b" : "#22c55e"} />
          </>
        )}
        {utilizacaoGuindaste && (
          <SummaryRow
            label="Utilização guindaste"
            value={`${fmt(utilizacaoGuindaste.pct)}%`}
            color={utilizacaoGuindaste.risk === "DANGER" ? "#ef4444" : utilizacaoGuindaste.risk === "WARNING" ? "#f59e0b" : "#22c55e"}
          />
        )}
        {tensao && !tensao.bloqueado && (
          <SummaryRow label="Tensão/perna" value={`${fmt(tensao.tensao, 0)} kgf`} />
        )}
        {tensao?.bloqueado && (
          <SummaryRow label="Lingada" value="Ângulo BLOQUEADO" color="#ef4444" />
        )}
        {checklistProgresso != null && (
          <SummaryRow
            label="Checklist"
            value={`${checklistProgresso}% concluído`}
            color={checklistProgresso === 100 ? "#22c55e" : checklistProgresso >= 70 ? "#f59e0b" : "#ef4444"}
          />
        )}
      </div>

      {/* Solicitação de liberação */}
      <div style={S.card}>
        <div style={{ fontSize: 12, color: "#38bdf8", fontWeight: 700, letterSpacing: 1, textTransform: "uppercase", marginBottom: 12 }}>
          Solicitação de Liberação
        </div>

        {solicitacao ? (
          <div>
            {solicitacao.status === "ANALISAR" && (
              <div style={{ background: "#1e2a1a", border: "1px solid #f59e0b44", borderRadius: 10, padding: 28, textAlign: "center" }}>
                <div style={{ fontSize: 36, marginBottom: 12 }}>⏳</div>
                <div style={{ fontWeight: 700, fontSize: 14, color: "#f59e0b", marginBottom: 6 }}>Aguardando autorização</div>
                <div style={{ color: "#94a3b8", fontSize: 12 }}>OS: <strong style={{ color: "#fff" }}>{solicitacao.operacaoOs}</strong></div>
                <div style={{ color: "#64748b", fontSize: 11, marginTop: 8 }}>Verificando a cada 5 segundos...</div>
              </div>
            )}

            {solicitacao.status === "PROSSEGUIR" && (
              <div style={{ background: "#052e16", border: "1px solid #22c55e44", borderRadius: 10, padding: 28, textAlign: "center" }}>
                <div style={{ fontSize: 40, marginBottom: 12 }}>✅</div>
                <div style={{ fontWeight: 800, fontSize: 16, color: "#22c55e", marginBottom: 8 }}>IÇAMENTO AUTORIZADO — PROSSEGUIR</div>
                <div style={{ color: "#94a3b8", fontSize: 12 }}>OS: <strong style={{ color: "#fff" }}>{solicitacao.operacaoOs}</strong></div>
                <div style={{ color: "#22c55e", fontSize: 13, marginTop: 6 }}>Autorizado por: <strong>{solicitacao.aprovadoPorNome}</strong></div>
                {solicitacao.observacao && (
                  <div style={{ color: "#94a3b8", fontSize: 12, marginTop: 8, fontStyle: "italic" }}>"{solicitacao.observacao}"</div>
                )}
              </div>
            )}

            {solicitacao.status === "PARAR" && (
              <div style={{ background: "#1c0a0a", border: "1px solid #ef4444", borderRadius: 10, padding: 28, textAlign: "center" }}>
                <div style={{ fontSize: 40, marginBottom: 12 }}>🚫</div>
                <div style={{ fontWeight: 800, fontSize: 16, color: "#ef4444", marginBottom: 8 }}>IÇAMENTO NÃO AUTORIZADO — PARAR</div>
                <div style={{ color: "#94a3b8", fontSize: 12 }}>OS: <strong style={{ color: "#fff" }}>{solicitacao.operacaoOs}</strong></div>
                {solicitacao.observacao && (
                  <div style={{ color: "#fca5a5", fontSize: 12, marginTop: 8, fontStyle: "italic" }}>Motivo: "{solicitacao.observacao}"</div>
                )}
              </div>
            )}

            <button
              onClick={novaOperacao}
              style={{ marginTop: 16, background: "transparent", border: "1px solid #334155", color: "#64748b", borderRadius: 8, padding: "8px 18px", cursor: "pointer", fontSize: 13 }}
            >
              Cancelar / Nova Operação
            </button>
          </div>
        ) : (
          <div>
            <div style={{ fontSize: 12, color: "#64748b", marginBottom: 16 }}>
              O número da OS é pré-preenchido com o dado da Etapa 1. Confirme e envie para autorização.
            </div>
            <label style={S.label}>Número da OS</label>
            <input
              style={S.input}
              placeholder="Ex: OS-2025-089"
              value={jobId}
              onChange={e => setJobId(e.target.value)}
            />
            <div style={{ marginTop: 10, fontSize: 12, color: "#64748b", display: "flex", gap: 16, flexWrap: "wrap" }}>
              <span>Operador: <strong style={{ color: "#94a3b8" }}>{planData.riggerNome || user?.userName || "—"}</strong></span>
              <span>Perfil: <strong style={{ color: "#94a3b8" }}>{user?.role || "—"}</strong></span>
            </div>
            {error && (
              <div style={{ marginTop: 12, background: "#1c0a0a", border: "1px solid #ef444444", borderRadius: 8, padding: "10px 14px", color: "#fca5a5", fontSize: 13 }}>
                {error}
              </div>
            )}
            <button
              onClick={solicitarLiberacao}
              disabled={loading}
              style={{
                marginTop: 16,
                background: loading ? "#1e293b" : "#3b82f6",
                border: "none",
                color: loading ? "#475569" : "#fff",
                borderRadius: 8,
                padding: "12px 28px",
                cursor: loading ? "not-allowed" : "pointer",
                fontWeight: 700,
                fontSize: 14,
              }}
            >
              {loading ? "Enviando..." : "📤 Solicitar Autorização"}
            </button>
          </div>
        )}
      </div>

      <div style={{ background: "#0f172a", border: "1px solid #1e293b", borderRadius: 8, padding: "10px 14px", fontSize: 11, color: "#475569" }}>
        Após autorização, avance para a etapa de Relatório Final para gerar o PDF da operação.
      </div>
    </div>
  );
}
