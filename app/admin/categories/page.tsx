"use client";

import Link from "next/link";
import { useCallback, useEffect, useMemo, useState } from "react";
import { motion } from "framer-motion";
import {
  ArrowLeft,
  Check,
  Download,
  Link2,
  Loader2,
  PencilLine,
  Plus,
  RefreshCw,
  Save,
  Search,
  Tag,
  Tags,
  X,
} from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import {
  createAdminCategory,
  deleteAdminCategoryAlias,
  downloadAdminCategoryExport,
  listAdminCategories,
  updateAdminCategory,
  upsertAdminCategoryAlias,
  type AdminCategoryCatalog,
  type AdminCategoryItem,
  type AdminRawCategoryItem,
} from "@/lib/auth";

type RawStatusFilter = "all" | "unmapped" | "mapped";

function getErrorMessage(error: unknown) {
  return error instanceof Error ? error.message : "Please try again.";
}

function formatDateTime(value?: string | null) {
  if (!value) return "-";
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) return value;
  return parsed.toLocaleString();
}

function rawCategoryKey(row: AdminRawCategoryItem) {
  return (row.normalizedCategory || "__competing_events__") + "::" + row.displayCategory;
}

function statusTone(status: string) {
  if (status === "unmapped") return "border-amber-200 bg-amber-50 text-amber-700";
  if (status === "mapped") return "border-blue-200 bg-blue-50 text-blue-700";
  if (status === "canonical") return "border-emerald-200 bg-emerald-50 text-emerald-700";
  return "border-zinc-200 bg-zinc-50 text-zinc-500";
}

function statusLabel(status: string) {
  if (status === "unmapped") return "Needs mapping";
  if (status === "mapped") return "Alias mapped";
  if (status === "canonical") return "Canonical";
  if (status === "system") return "System";
  return status || "Unknown";
}

function matchesSearch(values: Array<string | null | undefined>, query: string) {
  if (!query) return true;
  return values.some((value) => String(value || "").toLowerCase().includes(query));
}

export default function AdminCategoriesPage() {
  const [catalog, setCatalog] = useState<AdminCategoryCatalog | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [exporting, setExporting] = useState(false);
  const [categorySearch, setCategorySearch] = useState("");
  const [rawSearch, setRawSearch] = useState("");
  const [rawStatus, setRawStatus] = useState<RawStatusFilter>("unmapped");
  const [newCategoryName, setNewCategoryName] = useState("");
  const [creating, setCreating] = useState(false);
  const [editingId, setEditingId] = useState("");
  const [editName, setEditName] = useState("");
  const [editActive, setEditActive] = useState(true);
  const [savingCategoryId, setSavingCategoryId] = useState("");
  const [aliasInputs, setAliasInputs] = useState<Record<string, string>>({});
  const [savingAliasId, setSavingAliasId] = useState("");
  const [selectedRawKey, setSelectedRawKey] = useState("");
  const [mapSearch, setMapSearch] = useState("");
  const [mapCategoryId, setMapCategoryId] = useState("");
  const [mappingRawKey, setMappingRawKey] = useState("");

  const loadCatalog = useCallback(async (mode: "initial" | "refresh" = "refresh") => {
    if (mode === "initial") setLoading(true);
    else setRefreshing(true);
    try {
      const next = await listAdminCategories();
      setCatalog(next);
      setSelectedRawKey((current) => {
        if (!current) return "";
        return next.rawCategories.some((row) => rawCategoryKey(row) === current) ? current : "";
      });
    } catch (error: unknown) {
      toast.error("Failed to load category registry", { description: getErrorMessage(error) });
      setCatalog(null);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    void loadCatalog("initial");
  }, [loadCatalog]);

  const categories = useMemo(() => catalog?.categories ?? [], [catalog]);
  const rawCategories = useMemo(() => catalog?.rawCategories ?? [], [catalog]);
  const summary = catalog?.summary;
  const activeCategories = useMemo(() => categories.filter((item) => item.isActive), [categories]);

  const filteredCategories = useMemo(() => {
    const query = categorySearch.trim().toLowerCase();
    return categories.filter((item) =>
      matchesSearch(
        [
          item.name,
          item.slug,
          item.normalizedName,
          ...item.aliases.map((alias) => alias.aliasText),
        ],
        query
      )
    );
  }, [categories, categorySearch]);

  const filteredRawCategories = useMemo(() => {
    const query = rawSearch.trim().toLowerCase();
    return rawCategories.filter((row) => {
      const statusMatch =
        rawStatus === "all" ||
        (rawStatus === "unmapped" && row.status === "unmapped") ||
        (rawStatus === "mapped" && row.status !== "unmapped");
      return (
        statusMatch &&
        matchesSearch(
          [row.displayCategory, row.normalizedCategory, row.canonicalCategoryName, row.status],
          query
        )
      );
    });
  }, [rawCategories, rawSearch, rawStatus]);

  const selectedRaw = useMemo(
    () => rawCategories.find((row) => rawCategoryKey(row) === selectedRawKey) ?? null,
    [rawCategories, selectedRawKey]
  );

  const visibleMapCategories = useMemo(() => {
    const query = mapSearch.trim().toLowerCase();
    return activeCategories.filter((item) =>
      matchesSearch([item.name, item.slug, item.normalizedName], query)
    );
  }, [activeCategories, mapSearch]);

  const startEdit = (category: AdminCategoryItem) => {
    setEditingId(category.id);
    setEditName(category.name);
    setEditActive(category.isActive);
  };

  const cancelEdit = () => {
    setEditingId("");
    setEditName("");
    setEditActive(true);
  };

  const createCategory = async () => {
    const name = newCategoryName.trim();
    if (!name) {
      toast.error("Category name is required");
      return;
    }

    setCreating(true);
    try {
      await createAdminCategory({ name, isActive: true });
      toast.success("Category created", { description: name + " is now available for mappings." });
      setNewCategoryName("");
      await loadCatalog();
    } catch (error: unknown) {
      toast.error("Category create failed", { description: getErrorMessage(error) });
    } finally {
      setCreating(false);
    }
  };

  const saveCategory = async (category: AdminCategoryItem) => {
    const name = editName.trim();
    if (!name) {
      toast.error("Category name is required");
      return;
    }

    setSavingCategoryId(category.id);
    try {
      await updateAdminCategory(category.id, {
        name: category.isSystem ? undefined : name,
        isActive: category.isSystem ? undefined : editActive,
      });
      toast.success("Category updated");
      cancelEdit();
      await loadCatalog();
    } catch (error: unknown) {
      toast.error("Category update failed", { description: getErrorMessage(error) });
    } finally {
      setSavingCategoryId("");
    }
  };

  const addAlias = async (category: AdminCategoryItem) => {
    const aliasText = (aliasInputs[category.id] || "").trim();
    if (!aliasText) {
      toast.error("Alias text is required");
      return;
    }

    setSavingAliasId(category.id);
    try {
      await upsertAdminCategoryAlias(category.id, aliasText);
      toast.success("Alias mapped", { description: aliasText + " now resolves to " + category.name + "." });
      setAliasInputs((current) => ({ ...current, [category.id]: "" }));
      await loadCatalog();
    } catch (error: unknown) {
      toast.error("Alias mapping failed", { description: getErrorMessage(error) });
    } finally {
      setSavingAliasId("");
    }
  };

  const removeAlias = async (aliasId: string) => {
    setSavingAliasId(aliasId);
    try {
      await deleteAdminCategoryAlias(aliasId);
      toast.success("Alias removed");
      await loadCatalog();
    } catch (error: unknown) {
      toast.error("Alias remove failed", { description: getErrorMessage(error) });
    } finally {
      setSavingAliasId("");
    }
  };

  const openRawMapping = (row: AdminRawCategoryItem) => {
    const nextKey = rawCategoryKey(row);
    setSelectedRawKey((current) => (current === nextKey ? "" : nextKey));
    setMapSearch("");
    setMapCategoryId(row.canonicalCategoryId || activeCategories.find((item) => !item.isSystem)?.id || activeCategories[0]?.id || "");
  };

  const mapRawCategory = async (row: AdminRawCategoryItem) => {
    if (!mapCategoryId) {
      toast.error("Select a canonical category first");
      return;
    }

    setMappingRawKey(rawCategoryKey(row));
    try {
      await upsertAdminCategoryAlias(mapCategoryId, row.rawCategory || row.displayCategory);
      const target = activeCategories.find((item) => item.id === mapCategoryId)?.name || "selected category";
      toast.success("Raw category mapped", { description: row.displayCategory + " now resolves to " + target + "." });
      setSelectedRawKey("");
      await loadCatalog();
    } catch (error: unknown) {
      toast.error("Raw category mapping failed", { description: getErrorMessage(error) });
    } finally {
      setMappingRawKey("");
    }
  };

  const exportCatalog = async () => {
    setExporting(true);
    try {
      await downloadAdminCategoryExport();
      toast.success("Category export started");
    } catch (error: unknown) {
      toast.error("Category export failed", { description: getErrorMessage(error) });
    } finally {
      setExporting(false);
    }
  };

  return (
    <div className="admin-page">
      <motion.div
        initial={{ opacity: 0, y: -10 }}
        animate={{ opacity: 1, y: 0 }}
        className="admin-page-header flex flex-col gap-4 xl:flex-row xl:items-end xl:justify-between"
      >
        <div>
          <Link
            href="/admin"
            className="inline-flex items-center text-xs font-semibold text-zinc-500 transition-colors hover:text-zinc-950"
          >
            <ArrowLeft className="mr-2 h-3.5 w-3.5" />
            Admin dashboard
          </Link>
          <p className="admin-eyebrow mt-3">Admin Control</p>
          <h1 className="admin-title">Category Registry</h1>
          <p className="admin-description">
            Keep raw campaign category variants intact while mapping them into one canonical lead-sheet filter model.
          </p>
        </div>

        <div className="admin-actions">
          <Button
            type="button"
            variant="outline"
            onClick={() => void exportCatalog()}
            disabled={exporting || loading}
            className="h-10 border-zinc-300 bg-white px-4 text-zinc-700 hover:bg-zinc-50"
          >
            {exporting ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Download className="mr-2 h-4 w-4" />}
            Export Excel
          </Button>
          <Button
            type="button"
            variant="outline"
            onClick={() => void loadCatalog()}
            disabled={refreshing || loading}
            className="h-10 border-zinc-300 bg-white px-4 text-zinc-700 hover:bg-zinc-50"
          >
            {refreshing ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <RefreshCw className="mr-2 h-4 w-4" />}
            Refresh
          </Button>
        </div>
      </motion.div>

      <div className="mb-4 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        {[
          { label: "Canonical", value: summary?.categoryCount ?? 0, icon: Tags },
          { label: "Active", value: summary?.activeCategoryCount ?? 0, icon: Check },
          { label: "Raw variants", value: summary?.rawCategoryCount ?? 0, icon: Tag },
          { label: "Needs mapping", value: summary?.unmappedRawCategoryCount ?? 0, icon: Link2 },
        ].map((item) => (
          <div key={item.label} className="admin-card-soft p-4">
            <div className="flex items-start justify-between gap-3">
              <div>
                <p className="text-[10px] font-bold uppercase tracking-wider text-zinc-500">{item.label}</p>
                <p className="mt-2 text-3xl font-semibold tracking-tight text-zinc-950">{item.value}</p>
              </div>
              <span className="flex h-10 w-10 items-center justify-center rounded-lg border border-zinc-300 bg-zinc-50 text-zinc-700">
                <item.icon className="h-5 w-5" />
              </span>
            </div>
          </div>
        ))}
      </div>

      <div className="grid gap-4 xl:grid-cols-[minmax(0,1.05fr)_minmax(22rem,0.95fr)]">
        <Card className="admin-card p-5">
          <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
            <div>
              <p className="text-xs font-bold uppercase tracking-wider text-zinc-500">Canonical model</p>
              <h2 className="mt-1 text-lg font-semibold tracking-tight text-zinc-900">Managed categories</h2>
              <p className="mt-1 max-w-2xl text-sm leading-relaxed text-zinc-500">
                These names are what users see inside the lead-sheet category filter.
              </p>
            </div>
            <div className="flex w-full flex-col gap-2 sm:flex-row lg:w-auto">
              <Input
                value={newCategoryName}
                onChange={(event) => setNewCategoryName(event.target.value)}
                placeholder="New category name"
                className="h-10 min-w-0 border-zinc-300 bg-white sm:w-72"
                onKeyDown={(event) => {
                  if (event.key === "Enter") void createCategory();
                }}
              />
              <Button
                type="button"
                onClick={() => void createCategory()}
                disabled={creating}
                className="h-10 rounded-md bg-blue-600 px-4 text-sm font-semibold text-white hover:bg-blue-700"
              >
                {creating ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Plus className="mr-2 h-4 w-4" />}
                Add
              </Button>
            </div>
          </div>

          <div className="mt-5 flex items-center gap-2 rounded-lg border border-zinc-300 bg-white px-3">
            <Search className="h-4 w-4 text-zinc-400" />
            <Input
              value={categorySearch}
              onChange={(event) => setCategorySearch(event.target.value)}
              placeholder="Search categories or aliases"
              className="h-10 border-0 bg-transparent px-0 shadow-none focus-visible:ring-0"
            />
          </div>

          <div className="admin-list-panel mt-5 min-h-72 space-y-3 pr-1">
            {loading ? (
              <div className="flex h-56 items-center justify-center text-sm text-zinc-500">
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Loading category registry
              </div>
            ) : filteredCategories.length > 0 ? (
              filteredCategories.map((category) => {
                const isEditing = editingId === category.id;
                const isSaving = savingCategoryId === category.id;
                return (
                  <div key={category.id} className="rounded-lg border border-zinc-200 bg-white p-4">
                    <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
                      <div className="min-w-0 flex-1">
                        {isEditing ? (
                          <div className="space-y-3">
                            <Input
                              value={editName}
                              onChange={(event) => setEditName(event.target.value)}
                              disabled={category.isSystem}
                              className="h-10 border-zinc-300 bg-white font-semibold"
                            />
                            <button
                              type="button"
                              disabled={category.isSystem}
                              onClick={() => setEditActive((current) => !current)}
                              className={
                                editActive
                                  ? "inline-flex h-9 items-center rounded-md border border-emerald-200 bg-emerald-50 px-3 text-xs font-semibold text-emerald-700 disabled:opacity-60"
                                  : "inline-flex h-9 items-center rounded-md border border-zinc-300 bg-zinc-50 px-3 text-xs font-semibold text-zinc-500 disabled:opacity-60"
                              }
                            >
                              <Check className="mr-1.5 h-3.5 w-3.5" />
                              {editActive ? "Active" : "Inactive"}
                            </button>
                          </div>
                        ) : (
                          <>
                            <div className="flex flex-wrap items-center gap-2">
                              <h3 className="break-words text-base font-semibold tracking-tight text-zinc-950">
                                {category.name}
                              </h3>
                              <span
                                className={
                                  category.isActive
                                    ? "rounded-full border border-emerald-200 bg-emerald-50 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider text-emerald-700"
                                    : "rounded-full border border-zinc-200 bg-zinc-50 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider text-zinc-500"
                                }
                              >
                                {category.isActive ? "Active" : "Inactive"}
                              </span>
                              {category.isSystem ? (
                                <span className="rounded-full border border-blue-200 bg-blue-50 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider text-blue-700">
                                  System
                                </span>
                              ) : null}
                            </div>
                            <p className="mt-1 text-xs text-zinc-500">
                              {category.campaignCount} campaigns - {category.leadCount} leads - {category.aliasCount} aliases
                            </p>
                          </>
                        )}
                      </div>

                      <div className="flex shrink-0 gap-2">
                        {isEditing ? (
                          <>
                            <Button
                              type="button"
                              variant="outline"
                              onClick={cancelEdit}
                              disabled={isSaving}
                              className="h-9 border-zinc-300 bg-white px-3 text-xs font-semibold text-zinc-700 hover:bg-zinc-50"
                            >
                              <X className="mr-1.5 h-3.5 w-3.5" />
                              Cancel
                            </Button>
                            <Button
                              type="button"
                              onClick={() => void saveCategory(category)}
                              disabled={isSaving}
                              className="h-9 rounded-md bg-blue-600 px-3 text-xs font-semibold text-white hover:bg-blue-700"
                            >
                              {isSaving ? <Loader2 className="mr-1.5 h-3.5 w-3.5 animate-spin" /> : <Save className="mr-1.5 h-3.5 w-3.5" />}
                              Save
                            </Button>
                          </>
                        ) : (
                          <Button
                            type="button"
                            variant="outline"
                            onClick={() => startEdit(category)}
                            className="h-9 border-zinc-300 bg-white px-3 text-xs font-semibold text-zinc-700 hover:bg-zinc-50"
                          >
                            <PencilLine className="mr-1.5 h-3.5 w-3.5" />
                            Edit
                          </Button>
                        )}
                      </div>
                    </div>

                    <div className="mt-4 border-t border-zinc-100 pt-4">
                      <div className="flex flex-wrap gap-2">
                        {category.aliases.length > 0 ? (
                          category.aliases.map((alias) => (
                            <span
                              key={alias.id}
                              className="inline-flex max-w-full items-center gap-2 rounded-md border border-zinc-200 bg-zinc-50 px-2.5 py-1 text-xs font-medium text-zinc-700"
                            >
                              <span className="truncate">{alias.aliasText}</span>
                              <button
                                type="button"
                                aria-label={"Remove alias " + alias.aliasText}
                                onClick={() => void removeAlias(alias.id)}
                                disabled={savingAliasId === alias.id}
                                className="text-zinc-400 transition-colors hover:text-red-600 disabled:opacity-50"
                              >
                                {savingAliasId === alias.id ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <X className="h-3.5 w-3.5" />}
                              </button>
                            </span>
                          ))
                        ) : (
                          <span className="text-xs text-zinc-400">No aliases mapped yet</span>
                        )}
                      </div>

                      <div className="mt-3 flex flex-col gap-2 sm:flex-row">
                        <Input
                          value={aliasInputs[category.id] || ""}
                          onChange={(event) =>
                            setAliasInputs((current) => ({ ...current, [category.id]: event.target.value }))
                          }
                          disabled={!category.isActive}
                          placeholder="Add alias or paste raw category variant"
                          className="h-9 border-zinc-300 bg-white text-sm"
                          onKeyDown={(event) => {
                            if (event.key === "Enter") void addAlias(category);
                          }}
                        />
                        <Button
                          type="button"
                          variant="outline"
                          onClick={() => void addAlias(category)}
                          disabled={!category.isActive || savingAliasId === category.id}
                          className="h-9 shrink-0 border-zinc-300 bg-white px-3 text-xs font-semibold text-zinc-700 hover:bg-zinc-50"
                        >
                          {savingAliasId === category.id ? <Loader2 className="mr-1.5 h-3.5 w-3.5 animate-spin" /> : <Link2 className="mr-1.5 h-3.5 w-3.5" />}
                          Add alias
                        </Button>
                      </div>
                    </div>
                  </div>
                );
              })
            ) : (
              <div className="flex h-56 flex-col items-center justify-center rounded-lg border border-dashed border-zinc-300 bg-zinc-50/80 text-center">
                <Tags className="h-8 w-8 text-zinc-300" />
                <p className="mt-3 text-sm font-semibold text-zinc-700">No categories found</p>
                <p className="mt-1 text-xs text-zinc-500">Create a category or clear the search field.</p>
              </div>
            )}
          </div>
        </Card>

        <Card className="admin-card p-5">
          <div className="flex flex-col gap-4">
            <div>
              <p className="text-xs font-bold uppercase tracking-wider text-zinc-500">Raw category queue</p>
              <h2 className="mt-1 text-lg font-semibold tracking-tight text-zinc-900">Variants from campaigns</h2>
              <p className="mt-1 text-sm leading-relaxed text-zinc-500">
                Map duplicated spellings and outreach labels into canonical categories.
              </p>
            </div>

            <div className="grid grid-cols-3 gap-1 rounded-lg border border-zinc-200 bg-zinc-50 p-1">
              {[
                { value: "unmapped", label: "Needs", count: summary?.unmappedRawCategoryCount ?? 0 },
                { value: "mapped", label: "Mapped", count: summary?.mappedRawCategoryCount ?? 0 },
                { value: "all", label: "All", count: summary?.rawCategoryCount ?? 0 },
              ].map((item) => (
                <button
                  key={item.value}
                  type="button"
                  onClick={() => setRawStatus(item.value as RawStatusFilter)}
                  className={
                    rawStatus === item.value
                      ? "h-9 rounded-md bg-white px-2 text-xs font-bold uppercase tracking-wider text-zinc-950 shadow-sm"
                      : "h-9 rounded-md px-2 text-xs font-bold uppercase tracking-wider text-zinc-400 hover:bg-white/80 hover:text-zinc-700"
                  }
                >
                  {item.label} ({item.count})
                </button>
              ))}
            </div>

            <div className="flex items-center gap-2 rounded-lg border border-zinc-300 bg-white px-3">
              <Search className="h-4 w-4 text-zinc-400" />
              <Input
                value={rawSearch}
                onChange={(event) => setRawSearch(event.target.value)}
                placeholder="Search raw categories"
                className="h-10 border-0 bg-transparent px-0 shadow-none focus-visible:ring-0"
              />
            </div>
          </div>

          <div className="admin-list-panel mt-5 space-y-3 pr-1">
            {loading ? (
              <div className="flex h-56 items-center justify-center text-sm text-zinc-500">
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Loading raw categories
              </div>
            ) : filteredRawCategories.length > 0 ? (
              filteredRawCategories.map((row) => {
                const key = rawCategoryKey(row);
                const isSelected = selectedRaw ? rawCategoryKey(selectedRaw) === key : false;
                const canMap = row.status === "unmapped" || row.status === "mapped";
                const selectedTargetName = activeCategories.find((item) => item.id === mapCategoryId)?.name || "";
                return (
                  <div key={key} className="rounded-lg border border-zinc-200 bg-white p-4">
                    <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                      <div className="min-w-0">
                        <div className="flex flex-wrap items-center gap-2">
                          <h3 className="break-words text-sm font-semibold text-zinc-950">{row.displayCategory}</h3>
                          <span className={`rounded-full border px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider ${statusTone(row.status)}`}>
                            {statusLabel(row.status)}
                          </span>
                        </div>
                        <p className="mt-1 text-xs text-zinc-500">
                          {row.campaignCount} campaigns - {row.leadCount} leads - last used {formatDateTime(row.lastUsedAt)}
                        </p>
                        <p className="mt-1 text-xs text-zinc-400">
                          Resolves to {row.canonicalCategoryName || "no canonical category"}
                        </p>
                      </div>
                      <Button
                        type="button"
                        variant="outline"
                        onClick={() => openRawMapping(row)}
                        disabled={!canMap}
                        className="h-9 shrink-0 border-zinc-300 bg-white px-3 text-xs font-semibold text-zinc-700 hover:bg-zinc-50 disabled:opacity-50"
                      >
                        <Link2 className="mr-1.5 h-3.5 w-3.5" />
                        {row.status === "mapped" ? "Remap" : "Map"}
                      </Button>
                    </div>

                    {isSelected && canMap ? (
                      <div className="mt-4 rounded-lg border border-zinc-200 bg-zinc-50/80 p-3">
                        <div className="flex items-center gap-2 rounded-lg border border-zinc-300 bg-white px-3">
                          <Search className="h-4 w-4 text-zinc-400" />
                          <Input
                            value={mapSearch}
                            onChange={(event) => setMapSearch(event.target.value)}
                            placeholder="Search canonical category"
                            className="h-9 border-0 bg-transparent px-0 shadow-none focus-visible:ring-0"
                          />
                        </div>
                        <div className="mt-3 max-h-52 space-y-1 overflow-y-auto">
                          {visibleMapCategories.length > 0 ? (
                            visibleMapCategories.map((category) => {
                              const selected = category.id === mapCategoryId;
                              return (
                                <button
                                  key={category.id}
                                  type="button"
                                  onClick={() => setMapCategoryId(category.id)}
                                  className={
                                    selected
                                      ? "flex w-full items-center justify-between gap-3 rounded-md border border-blue-200 bg-blue-50 px-3 py-2 text-left text-sm font-semibold text-blue-800"
                                      : "flex w-full items-center justify-between gap-3 rounded-md border border-transparent px-3 py-2 text-left text-sm text-zinc-600 hover:border-zinc-200 hover:bg-white hover:text-zinc-950"
                                  }
                                >
                                  <span className="min-w-0 truncate">{category.name}</span>
                                  <span className="shrink-0 text-xs text-zinc-400">{category.aliasCount} aliases</span>
                                </button>
                              );
                            })
                          ) : (
                            <div className="rounded-md border border-dashed border-zinc-300 bg-white p-4 text-center text-sm text-zinc-400">
                              No active categories match this search.
                            </div>
                          )}
                        </div>
                        <div className="mt-3 flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                          <p className="text-xs text-zinc-500">
                            Selected: <span className="font-semibold text-zinc-700">{selectedTargetName || "None"}</span>
                          </p>
                          <div className="flex gap-2">
                            <Button
                              type="button"
                              variant="outline"
                              onClick={() => setSelectedRawKey("")}
                              disabled={mappingRawKey === key}
                              className="h-9 border-zinc-300 bg-white px-3 text-xs font-semibold text-zinc-700 hover:bg-zinc-50"
                            >
                              Cancel
                            </Button>
                            <Button
                              type="button"
                              onClick={() => void mapRawCategory(row)}
                              disabled={!mapCategoryId || mappingRawKey === key}
                              className="h-9 rounded-md bg-blue-600 px-3 text-xs font-semibold text-white hover:bg-blue-700"
                            >
                              {mappingRawKey === key ? <Loader2 className="mr-1.5 h-3.5 w-3.5 animate-spin" /> : <Save className="mr-1.5 h-3.5 w-3.5" />}
                              Save mapping
                            </Button>
                          </div>
                        </div>
                      </div>
                    ) : null}
                  </div>
                );
              })
            ) : (
              <div className="flex h-56 flex-col items-center justify-center rounded-lg border border-dashed border-zinc-300 bg-zinc-50/80 text-center">
                <Tag className="h-8 w-8 text-zinc-300" />
                <p className="mt-3 text-sm font-semibold text-zinc-700">No raw categories found</p>
                <p className="mt-1 text-xs text-zinc-500">Try another status tab or clear the search field.</p>
              </div>
            )}
          </div>
        </Card>
      </div>
    </div>
  );
}
