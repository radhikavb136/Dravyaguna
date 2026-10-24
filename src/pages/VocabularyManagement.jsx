import { useMemo, useState, useEffect } from "react"
import {
  getFilterOptions,
  createKarmaTerm,
  createIndicationTerm,
  updateManagedTerm,
  deleteManagedTerm,
  mergeManagedTerms,
} from "../api/vocabulary"
import "../styles/VocabularyManagement.css"

function generateTermId() {
  return Date.now().toString()
}

const toArray = (value) => {
  if (Array.isArray(value)) {
    return value
      .filter(Boolean)
      .map((item) => String(item).trim())
      .filter(Boolean)
  }

  if (
    typeof value === "string" &&
    value.trim()
  ) {
    return value
      .split(",")
      .map((item) => item.trim())
      .filter(Boolean)
  }

  return []
}

/* =========================================================
   GET REAL HERB VOCABULARY VALUES
========================================================= */

const getHerbCategoryValues = (
  herb,
  category
) => {
  switch (category) {
    case "Rasa":
      return toArray(herb.rasa)

    case "Guna":
      return toArray(herb.guna)

    case "Dhatu":
      return toArray(
        herb.dhatu ||
        herb.dhatuAffinity
      )

    case "Mala":
      return toArray(
        herb.mala ||
        herb.malaAffinity
      )

    case "Srotas":
      return toArray(herb.srotas)

    case "Karma":
      return toArray(
        herb.karma ||
        herb.therapeuticActions
      )

    case "Indications":
      return toArray(
        herb.indications ||
        herb.therapeuticIndications ||
        herb.mainIndications
      )

    case "Virya":
      return herb.virya
        ? [String(herb.virya).trim()]
        : []

    case "Vipaka":
      return herb.vipaka
        ? [String(herb.vipaka).trim()]
        : []

    default:
      return []
  }
}

function VocabularyManagement() {
  const [activeCategory, setActiveCategory] = useState("Rasa")
  const [isAddTermOpen, setIsAddTermOpen] = useState(false)
  const [searchTerm, setSearchTerm] = useState("")
  const [editingTermId, setEditingTermId] = useState(null)
  const [mergingTerm, setMergingTerm] = useState(null)
  const [mergeTargetId, setMergeTargetId] = useState("")
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [mutationError, setMutationError] = useState("")
  const [mutationSuccess, setMutationSuccess] = useState("")
  const useApi = import.meta.env.VITE_USE_API === "true"
  const isManagedApiCategory = (category) => category === "Karma" || category === "Indications"

  const categories = [
    "Rasa",
    "Guna",
    "Virya",
    "Vipaka",
    "Dhatu",
    "Mala",
    "Srotas",
    "Karma",
    "Indications",
  ]

  /* =========================================================
     FORM
  ========================================================= */

  const [termForm, setTermForm] = useState({
    category: "Rasa",
    term: "",
    sanskrit: "",
    english: "",
    description: "",
    status: "Active",
  })

  /* =========================================================
     LOAD VOCABULARY
  ========================================================= */

  const [vocabularyData, setVocabularyData] = useState([])

  const loadVocabulary = async () => {
    setLoading(true)
    setError(null)
    
    try {
      const useApi = import.meta.env.VITE_USE_API === 'true'
      
      if (useApi) {
        const response = await getFilterOptions()
        // Convert API format to page format
        const formattedData = []
        Object.entries(response).forEach(([category, terms]) => {
          if (Array.isArray(terms)) {
            terms.forEach(term => {
              formattedData.push({
                id: term.id,
                term: term.canonical_en,
                category: category.charAt(0).toUpperCase() + category.slice(1),
                status: term.status || null,
                is_custom: term.is_custom || false,
              })
            })
          }
        })
        setVocabularyData(formattedData)
      } else {
        // Fallback to localStorage for mock data
        const savedVocabulary = JSON.parse(
          localStorage.getItem("vocabulary") || "[]"
        )
        setVocabularyData(Array.isArray(savedVocabulary) ? savedVocabulary : [])
      }
    } catch (err) {
      console.error('Failed to load vocabulary:', err)
      setError('Failed to load vocabulary')
      setVocabularyData([])
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadVocabulary()
  }, [])

  /* =========================================================
     LOAD HERBS
  ========================================================= */

  const herbs = useMemo(() => {
    try {
      const savedHerbs = JSON.parse(
        localStorage.getItem("herbs") || "[]"
      )

      return Array.isArray(savedHerbs)
        ? savedHerbs
        : []
    } catch {
      return []
    }
  }, [])

  /* =========================================================
     HELPERS
  ========================================================= */


  /* =========================================================
     REAL USAGE COUNT
  ========================================================= */

  const getUsageCount = (
    vocabularyTerm
  ) => {
    if (useApi) return null
    const normalizedTerm =
      String(vocabularyTerm)
        .trim()
        .toLowerCase()

    if (!normalizedTerm) {
      return 0
    }

    let count = 0

    herbs.forEach((herb) => {
      const values =
        getHerbCategoryValues(
          herb,
          activeCategory
        )

      const matches =
        values.some(
          (value) =>
            String(value)
              .trim()
              .toLowerCase() ===
            normalizedTerm
        )

      if (matches) {
        count += 1
      }
    })

    return count
  }

  /* =========================================================
     VOCABULARY WITH REAL USAGE
  ========================================================= */

  const vocabularyWithUsage = useMemo(() => {
    return vocabularyData.map(
      (item) => ({
        ...item,
          realUsage: (() => {
            if (useApi) return null
          const normalizedTerm =
            String(item.term || "")
              .trim()
              .toLowerCase()

          if (!normalizedTerm) {
            return 0
          }

          let count = 0

          herbs.forEach((herb) => {
            const values =
              getHerbCategoryValues(
                herb,
                item.category
              )

            const matches =
              values.some(
                (value) =>
                  String(value)
                    .trim()
                    .toLowerCase() ===
                  normalizedTerm
              )

            if (matches) {
              count += 1
            }
          })

          return count
        })(),
      })
    )
  }, [vocabularyData, herbs, useApi])

  /* =========================================================
     FILTER DATA
  ========================================================= */

  const filteredData =
    vocabularyWithUsage.filter(
      (item) => {
        const matchesCategory =
          item.category ===
          activeCategory

        const query =
          searchTerm
            .trim()
            .toLowerCase()

        const matchesSearch =
          !query ||
          String(item.term || "")
            .toLowerCase()
            .includes(query) ||
          String(item.sanskrit || "")
            .toLowerCase()
            .includes(query) ||
          String(item.english || "")
            .toLowerCase()
            .includes(query) ||
          String(item.description || "")
            .toLowerCase()
            .includes(query)

        return (
          matchesCategory &&
          matchesSearch
        )
      }
    )

  /* =========================================================
     MERGE TARGET OPTIONS
  ========================================================= */

  const mergeTargetOptions =
    vocabularyData.filter(
      (item) =>
        mergingTerm &&
        item.category ===
          mergingTerm.category &&
        item.id !== mergingTerm.id &&
        item.status === "Active"
    )

  /* =========================================================
     FORM CHANGE
  ========================================================= */

  const handleTermChange = (
    event
  ) => {
    const {
      name,
      value,
    } = event.target

    setTermForm(
      (previous) => ({
        ...previous,
        [name]: value,
      })
    )
  }

  /* =========================================================
     ADD / UPDATE TERM
  ========================================================= */

  const handleAddTerm = async (
    event
  ) => {
    event.preventDefault()

    const cleanedTerm =
      termForm.term.trim()

    const normalizedTerm =
      cleanedTerm.toLowerCase()

    if (!cleanedTerm) {
      alert(
        "Please enter the vocabulary term."
      )
      return
    }

    const duplicateTerm =
      vocabularyData.some(
        (item) =>
          item.id !== editingTermId &&
          item.category ===
            termForm.category &&
          String(item.term)
            .trim()
            .toLowerCase() ===
            normalizedTerm
      )

    if (duplicateTerm) {
      alert(
        `"${cleanedTerm}" already exists in ${termForm.category}.`
      )
      return
    }

    try {
      setMutationError("")
      setMutationSuccess("")
      
      if (useApi) {
        const category = termForm.category === 'Indications'
          ? 'indications'
          : termForm.category === 'Karma'
            ? 'karma'
            : null

        if (!category) {
          alert('API vocabulary management currently supports Karma and Indications.')
          return
        }

        if (editingTermId) {
          await updateManagedTerm(category, editingTermId, cleanedTerm)
        } else if (category === 'karma') {
          await createKarmaTerm(cleanedTerm)
        } else {
          await createIndicationTerm(cleanedTerm)
        }
        await loadVocabulary()
        setEditingTermId(null)
        setIsAddTermOpen(false)
        resetForm(termForm.category)
        setMutationSuccess(editingTermId ? "Vocabulary term updated." : "Vocabulary term added.")
      } else {
        // Fallback to localStorage for mock data
        /* UPDATE */

        if (editingTermId) {
          const updatedVocabulary =
            vocabularyData.map(
              (item) => {
                if (
                  item.id !==
                  editingTermId
                ) {
                  return item
                }

                return {
                  ...item,
                  term: cleanedTerm,
                  sanskrit:
                    termForm.sanskrit.trim(),
                  english:
                    termForm.english.trim(),
                  category:
                    termForm.category,
                  description:
                    termForm.description.trim(),
                  status:
                    termForm.status,
                  updatedAt:
                    new Date().toISOString(),
                }
              }
            )

          setVocabularyData(
            updatedVocabulary
          )

          localStorage.setItem(
            "vocabulary",
            JSON.stringify(
              updatedVocabulary
            )
          )

          setActiveCategory(
            termForm.category
          )

          setEditingTermId(null)
          setIsAddTermOpen(false)

          resetForm(
            termForm.category
          )

          alert(
            "Vocabulary term updated successfully."
          )

          return
        }

        /* ADD */

        const newTerm = {
          id:
            generateTermId(),

          term:
            cleanedTerm,

          sanskrit:
            termForm.sanskrit.trim(),

          english:
            termForm.english.trim(),

          category:
            termForm.category,

          description:
            termForm.description.trim(),

          status:
            termForm.status,

          createdAt:
            new Date().toISOString(),
        }

        const updatedVocabulary = [
          ...vocabularyData,
          newTerm,
        ]

        setVocabularyData(
          updatedVocabulary
        )

        localStorage.setItem(
          "vocabulary",
          JSON.stringify(
            updatedVocabulary
          )
        )

        setActiveCategory(
          termForm.category
        )

        setIsAddTermOpen(false)

        resetForm(
          termForm.category
        )

        alert(
          "Vocabulary term added successfully."
        )
      }
    } catch (err) {
      console.error('Failed to add vocabulary term:', err)
      setMutationError(err.message || 'Failed to save vocabulary term')
    }
  }

  /* =========================================================
     RESET FORM
  ========================================================= */

  const resetForm = (
    category = "Rasa"
  ) => {
    setTermForm({
      category,
      term: "",
      sanskrit: "",
      english: "",
      description: "",
      status: "Active",
    })
  }

  /* =========================================================
     STATUS CHANGE
  ========================================================= */

  const handleStatusChange = async (
    termId
  ) => {
    if (useApi) return

    const updatedVocabulary =
      vocabularyData.map(
        (item) => {
          if (
            item.id !== termId
          ) {
            return item
          }

          return {
            ...item,
            status:
              item.status ===
              "Active"
                ? "Inactive"
                : "Active",
            updatedAt:
              new Date().toISOString(),
          }
        }
      )

    setVocabularyData(
      updatedVocabulary
    )

    localStorage.setItem(
      "vocabulary",
      JSON.stringify(
        updatedVocabulary
      )
    )
  }

  /* =========================================================
     DELETE TERM
  ========================================================= */

  const handleDeleteTerm = async (
    termId
  ) => {
    const termToDelete =
      vocabularyData.find(
        (item) =>
          item.id === termId
      )

    if (!termToDelete) {
      return
    }

    const usage =
      getUsageCount(
        termToDelete.term
      )

    const usageMessage =
      usage > 0
        ? `\n\nThis term is currently used by ${usage} herb${
            usage === 1
              ? ""
              : "s"
          } in the ${termToDelete.category} field.`
        : ""

    const confirmDelete =
      window.confirm(
        `Are you sure you want to permanently delete "${termToDelete.term}"?${usageMessage}\n\nThis action cannot be undone.`
      )

    if (!confirmDelete) {
      return
    }

    if (useApi) {
      const category = termToDelete.category === 'Indications'
        ? 'indications'
        : termToDelete.category === 'Karma'
          ? 'karma'
          : null
      if (!category) {
        alert('Only Karma and Indications terms can be deleted through the API.')
        return
      }
      setMutationError("")
      setMutationSuccess("")
      try {
        await deleteManagedTerm(category, termId)
        await loadVocabulary()
        setMutationSuccess(`“${termToDelete.term}” was deleted.`)
      } catch (err) {
        setMutationError(err.message || "Unable to delete vocabulary term")
      }
      return
    }

    const updatedVocabulary =
      vocabularyData.filter(
        (item) =>
          item.id !== termId
      )

    setVocabularyData(
      updatedVocabulary
    )

    localStorage.setItem(
      "vocabulary",
      JSON.stringify(
        updatedVocabulary
      )
    )

    alert(
      `"${termToDelete.term}" was permanently deleted.`
    )
  }

  /* =========================================================
     EDIT TERM
  ========================================================= */

  const handleEditTerm = (
    termId
  ) => {
    const termToEdit =
      vocabularyData.find(
        (item) =>
          item.id === termId
      )

    if (!termToEdit) {
      return
    }

    setTermForm({
      category:
        termToEdit.category,
      term:
        termToEdit.term || "",
      sanskrit:
        termToEdit.sanskrit || "",
      english:
        termToEdit.english || "",
      description:
        termToEdit.description || "",
      status:
        termToEdit.status ||
        "Active",
    })

    setEditingTermId(
      termId
    )

    setIsAddTermOpen(true)
  }

  /* =========================================================
     OPEN MERGE
  ========================================================= */

  const handleOpenMerge = (
    termId
  ) => {
    const termToMerge =
      vocabularyData.find(
        (item) =>
          item.id === termId
      )

    if (!termToMerge) {
      return
    }

    setMergingTerm(
      termToMerge
    )

    setMergeTargetId("")
  }

  /* =========================================================
     MERGE TERMS
  ========================================================= */

  const handleMergeTerms = async () => {
    if (
      !mergingTerm ||
      !mergeTargetId
    ) {
      alert(
        "Please select a target term."
      )
      return
    }

    const targetTerm =
      vocabularyData.find(
        (item) =>
          item.id ===
          mergeTargetId
      )

    if (!targetTerm) {
      alert(
        "Target term not found."
      )
      return
    }

    if (
      mergingTerm.category !==
      targetTerm.category
    ) {
      alert(
        "Terms must belong to the same category."
      )
      return
    }

    if (
      mergingTerm.id ===
      targetTerm.id
    ) {
      alert(
        "A term cannot be merged into itself."
      )
      return
    }

    if (useApi) {
      const category = mergingTerm.category === 'Indications'
        ? 'indications'
        : mergingTerm.category === 'Karma'
          ? 'karma'
          : null
      if (!category) {
        alert('Only Karma and Indications terms can be merged through the API.')
        return
      }
      setMutationError("")
      setMutationSuccess("")
      try {
        await mergeManagedTerms(category, mergingTerm.id, targetTerm.id)
        await loadVocabulary()
        setMutationSuccess(`“${mergingTerm.term}” was merged into “${targetTerm.term}”.`)
        setMergingTerm(null)
        setMergeTargetId("")
      } catch (err) {
        setMutationError(err.message || "Unable to merge vocabulary terms")
      }
      return
    }

    const updatedVocabulary =
      vocabularyData.map(
        (item) => {
          if (
            item.id ===
            targetTerm.id
          ) {
            return {
              ...item,
              updatedAt:
                new Date().toISOString(),
            }
          }

          if (
            item.id ===
            mergingTerm.id
          ) {
            return {
              ...item,
              status:
                "Inactive",
              mergedInto:
                targetTerm.id,
              mergedIntoTerm:
                targetTerm.term,
              updatedAt:
                new Date().toISOString(),
            }
          }

          return item
        }
      )

    setVocabularyData(
      updatedVocabulary
    )

    localStorage.setItem(
      "vocabulary",
      JSON.stringify(
        updatedVocabulary
      )
    )

    setMergingTerm(null)
    setMergeTargetId("")

    alert(
      `"${mergingTerm.term}" was merged into "${targetTerm.term}".`
    )
  }

  /* =========================================================
     CLEAR SEARCH
  ========================================================= */

  const clearSearch = () => {
    setSearchTerm("")
  }

  /* =========================================================
     RENDER
  ========================================================= */

  if (loading) {
    return <p role="status">Loading vocabulary...</p>
  }

  if (error) {
    return <p role="alert">{error}</p>
  }

  return (
    <div className="vocabulary-page">

      {/* =====================================================
          PAGE HEADER
      ===================================================== */}

      <div className="vocabulary-page-header">

        <div>

          <p className="vocabulary-label">
            KNOWLEDGE MANAGEMENT
          </p>

          <h1>
            Vocabulary Management
          </h1>

          <p className="vocabulary-description">
            Maintain standardized Ayurvedic terms and searchable values.
          </p>

        </div>

        <button
          type="button"
          className="vocabulary-add-button"
          disabled={useApi && !isManagedApiCategory(activeCategory)}
          title={useApi && !isManagedApiCategory(activeCategory) ? "Only Karma and Indications can be edited through the configured API." : undefined}
          onClick={() => {
            setEditingTermId(null)

            resetForm(
              activeCategory
            )

            setIsAddTermOpen(true)
          }}
        >
          <span>＋</span>
          Add Term
        </button>

      </div>

      {mutationError && <p role="alert">{mutationError}</p>}
      {mutationSuccess && <p role="status">{mutationSuccess}</p>}


      {/* =====================================================
          CATEGORY TABS
      ===================================================== */}

      <div className="vocabulary-category-tabs">

        {categories.map(
          (category) => (

            <button
              key={category}
              type="button"
              className={`vocabulary-category-tab ${
                activeCategory ===
                category
                  ? "active"
                  : ""
              }`}
              onClick={() => {
                setActiveCategory(
                  category
                )

                setSearchTerm("")
              }}
            >
              {category}
            </button>

          )
        )}

      </div>


      {/* =====================================================
          SEARCH + COUNT
      ===================================================== */}

      <section className="vocabulary-table-card">

        <div className="vocabulary-search-row">

          <div className="vocabulary-search-box">

            <span>
              ⌕
            </span>

            <input
              type="text"
              placeholder={`Search ${activeCategory.toLowerCase()} terms...`}
              value={searchTerm}
              onChange={(event) =>
                setSearchTerm(
                  event.target.value
                )
              }
            />

          </div>

          <span className="vocabulary-term-count">
            {filteredData.length}{" "}
            {filteredData.length ===
            1
              ? "term"
              : "terms"}{" "}
            in {activeCategory}
          </span>

        </div>


        {/* =====================================================
            TABLE
        ===================================================== */}

        <div className="vocabulary-table-wrapper">

          <table className="vocabulary-table">

            <thead>

              <tr>

                <th>
                  TERM
                </th>

                <th>
                  SANSKRIT
                </th>

                <th>
                  ENGLISH
                </th>

                <th>
                  CATEGORY
                </th>

                <th>
                  DESCRIPTION
                </th>

                <th>
                  USAGE
                </th>

                <th>
                  STATUS
                </th>

                <th>
                  ACTIONS
                </th>

              </tr>

            </thead>


            <tbody>

              {filteredData.length >
              0 ? (

                filteredData.map(
                  (item) => (

                    <tr
                      key={
                        item.id ||
                        item.term
                      }
                    >

                      <td className="vocabulary-term">
                        {item.term}
                        {item.is_custom && (
                          <span className="vocabulary-category-badge" title="Custom term">
                            custom
                          </span>
                        )}
                      </td>

                      <td className="vocabulary-sanskrit">
                        {item.sanskrit ||
                          "—"}
                      </td>

                      <td>
                        {item.english ||
                          "—"}
                      </td>

                      <td>

                        <span className="vocabulary-category-badge">
                          {item.category}
                        </span>

                      </td>

                      <td className="vocabulary-description-cell">
                        {item.description ||
                          "—"}
                      </td>

                      <td className="vocabulary-usage">
                        {item.realUsage ?? "—"}
                      </td>

                      <td>

                        <span
                          className={`vocabulary-status ${
                            item.status ===
                            "Active"
                              ? "active"
                              : "inactive"
                          }`}
                        >
                          {item.status || (useApi ? "Available" : "Inactive")}
                        </span>

                      </td>

                      <td>

                        <div className="vocabulary-actions">

                          {/* EDIT */}

                          {(!useApi || isManagedApiCategory(item.category)) && <button
                            type="button"
                            className="vocabulary-action-button"
                            title="Edit vocabulary term"
                            aria-label="Edit vocabulary term"
                            onClick={() =>
                              handleEditTerm(
                                item.id
                              )
                            }
                          >
                            ✎
                          </button>}


                          {/* MERGE */}

                          {(!useApi || isManagedApiCategory(item.category)) && <button
                            type="button"
                            className="vocabulary-action-text"
                            onClick={() =>
                              handleOpenMerge(
                                item.id
                              )
                            }
                          >
                            Merge
                          </button>}


                          {/* ACTIVATE / DEACTIVATE */}

                          {(!useApi || isManagedApiCategory(item.category)) && <button
                            type="button"
                            className="vocabulary-action-text"
                            onClick={() =>
                              handleStatusChange(
                                item.id
                              )
                            }
                          >
                            {item.status ===
                            "Active"
                              ? "Deactivate"
                              : "Activate"}
                          </button>}


                          {/* DELETE */}

                          {!useApi && <button
                            type="button"
                            className="vocabulary-action-delete"
                            onClick={() =>
                              handleDeleteTerm(
                                item.id
                              )
                            }
                          >
                            Delete
                          </button>}

                        </div>

                      </td>

                    </tr>

                  )
                )

              ) : (

                <tr>

                  <td
                    colSpan="8"
                    className="vocabulary-empty-state"
                  >

                    <div>

                      <strong>
                        No vocabulary terms available
                      </strong>

                      <p>
                        No {activeCategory.toLowerCase()} terms match your search.
                      </p>

                      {searchTerm && (
                        <button
                          type="button"
                          onClick={
                            clearSearch
                          }
                        >
                          Clear search
                        </button>
                      )}

                    </div>

                  </td>

                </tr>

              )}

            </tbody>

          </table>

        </div>

      </section>


      {/* =====================================================
          ADD / EDIT MODAL
      ===================================================== */}

      {isAddTermOpen && (

        <div className="vocabulary-modal-overlay">

          <div className="vocabulary-modal">

            <div className="vocabulary-modal-header">

              <div>

                <p className="vocabulary-modal-label">
                  KNOWLEDGE MANAGEMENT
                </p>

                <h2>
                  {editingTermId
                    ? "Edit Vocabulary Term"
                    : "Add Vocabulary Term"}
                </h2>

                <p>
                  Add a standardized term to the Ayurvedic knowledge vocabulary.
                </p>

              </div>

              <button
                type="button"
                className="vocabulary-modal-close"
                onClick={() => {
                  setIsAddTermOpen(
                    false
                  )

                  setEditingTermId(
                    null
                  )
                }}
                aria-label="Close"
              >
                ×
              </button>

            </div>


            <form
              className="vocabulary-term-form"
              onSubmit={
                handleAddTerm
              }
            >

              {/* CATEGORY */}

              <div className="vocabulary-form-field">

                <label htmlFor="vocabulary-category">
                  Category
                </label>

                <select
                  id="vocabulary-category"
                  name="category"
                  value={
                    termForm.category
                  }
                  onChange={
                    handleTermChange
                  }
                >

                  {categories.filter((category) => !useApi || isManagedApiCategory(category)).map(
                    (category) => (

                      <option
                        key={
                          category
                        }
                        value={
                          category
                        }
                      >
                        {category}
                      </option>

                    )
                  )}

                </select>

              </div>


              {/* TERM */}

              <div className="vocabulary-form-field">

                <label htmlFor="vocabulary-term">
                  Term{" "}
                  <span>*</span>
                </label>

                <input
                  id="vocabulary-term"
                  name="term"
                  type="text"
                  value={
                    termForm.term
                  }
                  onChange={
                    handleTermChange
                  }
                  placeholder="e.g. Madhura"
                />

              </div>


              {/* SANSKRIT + ENGLISH: the current API persists only the canonical term. */}
              {!useApi && <>

              <div className="vocabulary-form-row">

                <div className="vocabulary-form-field">

                  <label htmlFor="vocabulary-sanskrit">
                    Sanskrit
                  </label>

                  <input
                    id="vocabulary-sanskrit"
                    name="sanskrit"
                    type="text"
                    value={
                      termForm.sanskrit
                    }
                    onChange={
                      handleTermChange
                    }
                    placeholder="e.g. मधुर"
                  />

                </div>


                <div className="vocabulary-form-field">

                  <label htmlFor="vocabulary-english">
                    English
                  </label>

                  <input
                    id="vocabulary-english"
                    name="english"
                    type="text"
                    value={
                      termForm.english
                    }
                    onChange={
                      handleTermChange
                    }
                    placeholder="e.g. Sweet"
                  />

                </div>

              </div>


              {/* DESCRIPTION */}

              <div className="vocabulary-form-field">

                <label htmlFor="vocabulary-description">
                  Description
                </label>

                <textarea
                  id="vocabulary-description"
                  name="description"
                  value={
                    termForm.description
                  }
                  onChange={
                    handleTermChange
                  }
                  placeholder="Describe the meaning or clinical relevance of this term..."
                  rows="4"
                />

              </div>


              </>}

              {/* STATUS is a demo-only field; managed API terms do not have status storage. */}
              {!useApi && <>

              <div className="vocabulary-form-field">

                <label htmlFor="vocabulary-status">
                  Status
                </label>

                <select
                  id="vocabulary-status"
                  name="status"
                  value={
                    termForm.status
                  }
                  onChange={
                    handleTermChange
                  }
                >

                  <option value="Active">
                    Active
                  </option>

                  <option value="Inactive">
                    Inactive
                  </option>

                </select>

              </div>
              </>}


              {/* ACTIONS */}

              <div className="vocabulary-modal-actions">

                <button
                  type="button"
                  className="vocabulary-cancel-button"
                  onClick={() => {
                    setIsAddTermOpen(
                      false
                    )

                    setEditingTermId(
                      null
                    )
                  }}
                >
                  Cancel
                </button>

                <button
                  type="submit"
                  className="vocabulary-save-button"
                >
                  {editingTermId
                    ? "Save Changes"
                    : "Add Term"}
                </button>

              </div>

            </form>

          </div>

        </div>

      )}


      {/* =====================================================
          MERGE MODAL
      ===================================================== */}

      {mergingTerm && (

        <div className="vocabulary-modal-overlay">

          <div className="vocabulary-modal">

            <div className="vocabulary-modal-header">

              <div>

                <p className="vocabulary-modal-label">
                  KNOWLEDGE MANAGEMENT
                </p>

                <h2>
                  Merge Vocabulary Term
                </h2>

                <p>
                  Merge a duplicate or equivalent term into a standardized vocabulary term.
                </p>

              </div>

              <button
                type="button"
                className="vocabulary-modal-close"
                onClick={() => {
                  setMergingTerm(
                    null
                  )

                  setMergeTargetId(
                    ""
                  )
                }}
                aria-label="Close"
              >
                ×
              </button>

            </div>


            <div className="vocabulary-merge-content">

              {/* SOURCE */}

              <div className="vocabulary-merge-source">

                <span className="vocabulary-merge-label">
                  SOURCE TERM
                </span>

                <strong>
                  {mergingTerm.term}
                </strong>

                <span>
                  {mergingTerm.category}
                </span>

                <small>
                  Current usage:{" "}
                  {getUsageCount(
                    mergingTerm.term
                  ) ?? "—"}
                </small>

              </div>


              <div className="vocabulary-merge-arrow">
                ↓
              </div>


              {/* TARGET */}

              <div className="vocabulary-form-field">

                <label htmlFor="merge-target">
                  Merge into
                </label>

                <select
                  id="merge-target"
                  value={
                    mergeTargetId
                  }
                  onChange={(
                    event
                  ) =>
                    setMergeTargetId(
                      event.target.value
                    )
                  }
                >

                  <option value="">
                    Select target term
                  </option>

                  {mergeTargetOptions.map(
                    (item) => (

                      <option
                        key={
                          item.id
                        }
                        value={
                          item.id
                        }
                      >
                        {item.term}
                      </option>

                    )
                  )}

                </select>

              </div>


              {/* TARGET PREVIEW */}

              {mergeTargetId && (

                <div className="vocabulary-merge-target-preview">

                  {(() => {

                    const targetTerm =
                      vocabularyData.find(
                        (item) =>
                          item.id ===
                          mergeTargetId
                      )

                    if (
                      !targetTerm
                    ) {
                      return null
                    }

                    return (
                      <>
                        <span className="vocabulary-merge-label">
                          TARGET TERM
                        </span>

                        <strong>
                          {
                            targetTerm.term
                          }
                        </strong>

                        <span>
                          {
                            targetTerm.category
                          }
                        </span>

                        <small>
                          Current usage:{" "}
                          {getUsageCount(
                            targetTerm.term
                          ) ?? "—"}
                        </small>
                      </>
                    )

                  })()}

                </div>

              )}


              {/* WARNING */}

              <div className="vocabulary-merge-warning">

                <strong>
                  What will happen?
                </strong>

                <p>
                  The source term will become inactive and its future use will point to the selected standardized term.
                </p>

              </div>


              {/* ACTIONS */}

              <div className="vocabulary-modal-actions">

                <button
                  type="button"
                  className="vocabulary-cancel-button"
                  onClick={() => {
                    setMergingTerm(
                      null
                    )

                    setMergeTargetId(
                      ""
                    )
                  }}
                >
                  Cancel
                </button>

                <button
                  type="button"
                  className="vocabulary-save-button"
                  disabled={
                    !mergeTargetId
                  }
                  onClick={
                    handleMergeTerms
                  }
                >
                  Merge Terms
                </button>

              </div>

            </div>

          </div>

        </div>

      )}

    </div>
  )
}

export default VocabularyManagement
