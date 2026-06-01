import { useState, useEffect, useCallback } from "react";
import AppShell from "../layouts/AppShell";
import { useAuth } from "../context/AuthContext";
import AccessoriesList from "../modules/accessories/AccessoriesList";
import AccessoryForm from "../modules/accessories/AccessoryForm";
import AccessoryDetails from "../modules/accessories/AccessoryDetails";
import { listarAcessorios, criarAcessorio, atualizarAcessorio } from "../modules/accessories/accessoriesApi";

const ROLES_GESTAO = ["SUPER_ADMIN", "SAFETY_ADMIN", "ADMIN_EMPRESA", "LIDER_EQUIPE", "GERENTE_OPERACOES"];

export default function AccessoriesInventory() {
  const { user } = useAuth();
  const canManage = ROLES_GESTAO.includes(user?.role);

  const [view,       setView]       = useState("list"); // "list" | "new" | "edit" | "detail"
  const [acessorios, setAcessorios] = useState([]);
  const [selected,   setSelected]   = useState(null);
  const [loading,    setLoading]    = useState(true);
  const [formLoad,   setFormLoad]   = useState(false);
  const [formError,  setFormError]  = useState(null);

  const reload = useCallback(async () => {
    setLoading(true);
    try {
      const data = await listarAcessorios();
      setAcessorios(data);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { reload(); }, [reload]);

  const handleSave = async (payload) => {
    setFormLoad(true); setFormError(null);
    try {
      if (view === "edit" && selected) {
        await atualizarAcessorio(selected.id, payload);
      } else {
        await criarAcessorio(payload);
      }
      await reload();
      setView("list");
      setSelected(null);
    } catch (e) {
      setFormError(e.message);
    } finally {
      setFormLoad(false);
    }
  };

  const breadcrumb = [
    { label: "Inventário" },
    ...(view === "detail" && selected ? [{ label: selected.codigoInterno }] : []),
    ...(view === "new"  ? [{ label: "Novo Acessório" }] : []),
    ...(view === "edit" ? [{ label: "Editar" }] : []),
  ];

  return (
    <AppShell breadcrumb={breadcrumb}>
      {loading && view === "list" ? (
        <div style={{ textAlign: "center", padding: 60, color: "#64748b" }}>Carregando inventário...</div>
      ) : view === "list" ? (
        <AccessoriesList
          acessorios={acessorios}
          onSelect={(a) => { setSelected(a); setView("detail"); }}
          onNovo={canManage ? () => { setSelected(null); setView("new"); } : undefined}
        />
      ) : view === "new" || view === "edit" ? (
        <AccessoryForm
          initial={view === "edit" ? selected : null}
          onSave={handleSave}
          onCancel={() => { setView(selected ? "detail" : "list"); }}
          loading={formLoad}
          error={formError}
        />
      ) : view === "detail" && selected ? (
        <AccessoryDetails
          acessorioId={selected.id}
          onBack={() => { setSelected(null); setView("list"); reload(); }}
          onEdit={(a) => { setSelected(a); setView("edit"); }}
          canManage={canManage}
        />
      ) : null}
    </AppShell>
  );
}
