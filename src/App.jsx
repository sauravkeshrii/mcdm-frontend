import { useState } from "react";
import axios from "axios";

const API_BASE = "https://mcdm-backend.onrender.com"; // FastAPI backend

export default function App() {
  // Criteria: each has a name and type (min/max)
  const [criteria, setCriteria] = useState([
    { name: "Ra (Surface Roughness)", type: "min" },
    { name: "MRS (Material Removal Speed)", type: "max" },
  ]);

  // Alternatives: each has a name and a value per criterion
  const [alternatives, setAlternatives] = useState([
    { name: "Alt 1", values: ["2.0410", "0.7306"] },
    { name: "Alt 2", values: ["2.9280", "1.3441"] },
    { name: "Alt 3", values: ["7.7040", "3.8894"] },
  ]);

  const [method, setMethod] = useState("all");
  const [useMerec, setUseMerec] = useState(true);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [response, setResponse] = useState(null);

  // Add / remove criteria
  const addCriterion = () => {
    const newName = `Criterion ${criteria.length + 1}`;
    const newCriteria = [...criteria, { name: newName, type: "max" }];
    const newAlternatives = alternatives.map((alt) => ({
      ...alt,
      values: [...alt.values, ""],
    }));
    setCriteria(newCriteria);
    setAlternatives(newAlternatives);
  };

  const removeCriterion = (index) => {
    if (criteria.length <= 1) return;
    const newCriteria = criteria.filter((_, i) => i !== index);
    const newAlternatives = alternatives.map((alt) => ({
      ...alt,
      values: alt.values.filter((_, i) => i !== index),
    }));
    setCriteria(newCriteria);
    setAlternatives(newAlternatives);
  };

  // Add / remove alternatives
  const addAlternative = () => {
    const newName = `Alt ${alternatives.length + 1}`;
    const newAlt = {
      name: newName,
      values: Array(criteria.length).fill(""),
    };
    setAlternatives([...alternatives, newAlt]);
  };

  const removeAlternative = (index) => {
    if (alternatives.length <= 1) return;
    setAlternatives(alternatives.filter((_, i) => i !== index));
  };

  // Handle value change in the table
  const handleValueChange = (altIndex, critIndex, newValue) => {
    const updated = alternatives.map((alt, i) => {
      if (i !== altIndex) return alt;
      const newValues = [...alt.values];
      newValues[critIndex] = newValue;
      return { ...alt, values: newValues };
    });
    setAlternatives(updated);
  };

  const handleAltNameChange = (altIndex, newName) => {
    const updated = alternatives.map((alt, i) =>
      i === altIndex ? { ...alt, name: newName } : alt
    );
    setAlternatives(updated);
  };

  const handleCritNameChange = (critIndex, newName) => {
    const updated = criteria.map((c, i) =>
      i === critIndex ? { ...c, name: newName } : c
    );
    setCriteria(updated);
  };

  const handleCritTypeChange = (critIndex, newType) => {
    const updated = criteria.map((c, i) =>
      i === critIndex ? { ...c, type: newType } : c
    );
    setCriteria(updated);
  };

  // Build payload and call backend
  const handleRun = async () => {
    setError("");
    setResponse(null);

    // Validate numbers
    try {
      const decisionMatrix = alternatives.map((alt, ai) => {
        return alt.values.map((v, ci) => {
          if (v === "" || v === null || v === undefined) {
            throw new Error(
              `Empty value at Alternative ${ai + 1}, Criterion ${ci + 1}`
            );
          }
          const num = Number(v);
          if (Number.isNaN(num)) {
            throw new Error(
              `Invalid number at Alternative ${ai + 1}, Criterion ${ci + 1}`
            );
          }
          return num;
        });
      });

      const criteriaTypes = criteria.map((c) => c.type);

      const body = {
        decision_matrix: decisionMatrix,
        criteria_types: criteriaTypes,
        method,
        use_merec_weights: useMerec,
      };

      setLoading(true);
      const res = await axios.post(`${API_BASE}/mcdm/run`, body);
      setResponse(res.data);
    } catch (e) {
      setError(e.message || "Something went wrong");
    } finally {
      setLoading(false);
    }
  };

  // Show rankings with alternative names
  const renderRanking = () => {
    if (!response) return null;

    const topsisRanking = response.topsis_ranking;
    const maircaRanking = response.mairca_ranking;

    const nameForIndex = (i) =>
      alternatives[i] ? alternatives[i].name || `Alternative ${i + 1}` : `Alternative ${i + 1}`;

    return (
      <div style={{ marginTop: "1rem" }}>
        <h3>Rankings</h3>

        {topsisRanking && (
          <div style={{ marginTop: "0.5rem" }}>
            <strong>TOPSIS (best → worst):</strong>
            <ul>
              {topsisRanking.map((idx) => (
                <li key={"t" + idx}>{nameForIndex(idx)}</li>
              ))}
            </ul>
          </div>
        )}

        {maircaRanking && (
          <div style={{ marginTop: "0.5rem" }}>
            <strong>MAIRCA (best → worst):</strong>
            <ul>
              {maircaRanking.map((idx) => (
                <li key={"m" + idx}>{nameForIndex(idx)}</li>
              ))}
            </ul>
          </div>
        )}
      </div>
    );
  };

  return (
    <div
      style={{
        minHeight: "100vh",
        padding: "1.5rem",
        fontFamily: "system-ui, -apple-system, BlinkMacSystemFont, sans-serif",
        background: "#0f172a",
        color: "#e5e7eb",
      }}
    >
      <div
        style={{
          maxWidth: "1200px",
          margin: "0 auto",
          background: "#020617",
          padding: "1.5rem",
          borderRadius: "1rem",
          boxShadow: "0 20px 40px rgba(0,0,0,0.5)",
          border: "1px solid #1f2937",
        }}
      >
        <header style={{ marginBottom: "1.5rem" }}>
          <h1 style={{ fontSize: "1.75rem", marginBottom: "0.25rem" }}>
            MCDM Playground
          </h1>
          <p style={{ fontSize: "0.9rem", color: "#9ca3af" }}>
            Compare alternatives with multiple criteria using MEREC + TOPSIS +
            MAIRCA. No coding, just tables. Tease the life out of your decision
            tables.
          </p>
        </header>

        <div
          style={{
            display: "grid",
            gridTemplateColumns: "1.6fr 1fr",
            gap: "1.5rem",
            alignItems: "flex-start",
          }}
        >
          {/* LEFT: TABLE INPUT */}
          <div>
            <section style={{ marginBottom: "1rem" }}>
              <div
                style={{
                  display: "flex",
                  justifyContent: "space-between",
                  marginBottom: "0.5rem",
                  gap: "0.5rem",
                  flexWrap: "wrap",
                }}
              >
                <div>
                  <strong>Alternatives × Criteria</strong>
                  <div style={{ fontSize: "0.8rem", color: "#9ca3af" }}>
                    Type numbers directly into the table.
                  </div>
                </div>

                <div style={{ display: "flex", gap: "0.5rem" }}>
                  <button
                    onClick={addAlternative}
                    style={{
                      padding: "0.25rem 0.6rem",
                      borderRadius: "0.5rem",
                      border: "1px solid #16a34a",
                      background: "transparent",
                      color: "#bbf7d0",
                      fontSize: "0.8rem",
                      cursor: "pointer",
                    }}
                  >
                    + Alternative
                  </button>
                  <button
                    onClick={addCriterion}
                    style={{
                      padding: "0.25rem 0.6rem",
                      borderRadius: "0.5rem",
                      border: "1px solid #3b82f6",
                      background: "transparent",
                      color: "#bfdbfe",
                      fontSize: "0.8rem",
                      cursor: "pointer",
                    }}
                  >
                    + Criterion
                  </button>
                </div>
              </div>

              <div
                style={{
                  overflowX: "auto",
                  borderRadius: "0.75rem",
                  border: "1px solid #1f2937",
                }}
              >
                <table
                  style={{
                    width: "100%",
                    borderCollapse: "collapse",
                    fontSize: "0.85rem",
                  }}
                >
                  <thead>
                    <tr style={{ background: "#020617" }}>
                      <th
                        style={{
                          borderBottom: "1px solid #1f2937",
                          padding: "0.5rem",
                          textAlign: "left",
                          minWidth: "120px",
                        }}
                      >
                        Alternative
                      </th>
                      {criteria.map((c, ci) => (
                        <th
                          key={ci}
                          style={{
                            borderBottom: "1px solid #1f2937",
                            padding: "0.5rem",
                            textAlign: "left",
                            minWidth: "140px",
                          }}
                        >
                          <input
                            value={c.name}
                            onChange={(e) =>
                              handleCritNameChange(ci, e.target.value)
                            }
                            style={{
                              width: "100%",
                              marginBottom: "0.25rem",
                              padding: "0.2rem 0.3rem",
                              borderRadius: "0.35rem",
                              border: "1px solid #374151",
                              background: "#020617",
                              color: "#e5e7eb",
                              fontSize: "0.8rem",
                            }}
                          />
                          <select
                            value={c.type}
                            onChange={(e) =>
                              handleCritTypeChange(ci, e.target.value)
                            }
                            style={{
                              width: "100%",
                              padding: "0.2rem",
                              borderRadius: "0.35rem",
                              border: "1px solid #374151",
                              background: "#020617",
                              color: "#e5e7eb",
                              fontSize: "0.75rem",
                            }}
                          >
                            <option value="min">Minimize</option>
                            <option value="max">Maximize</option>
                          </select>
                          {criteria.length > 1 && (
                            <button
                              onClick={() => removeCriterion(ci)}
                              style={{
                                marginTop: "0.2rem",
                                fontSize: "0.7rem",
                                border: "none",
                                background: "transparent",
                                color: "#fca5a5",
                                cursor: "pointer",
                              }}
                            >
                              Remove
                            </button>
                          )}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {alternatives.map((alt, ai) => (
                      <tr
                        key={ai}
                        style={{
                          borderTop: "1px solid #111827",
                          background:
                            ai % 2 === 0 ? "#020617" : "rgba(15,23,42,0.9)",
                        }}
                      >
                        <td
                          style={{
                            padding: "0.4rem 0.5rem",
                            borderRight: "1px solid #111827",
                          }}
                        >
                          <input
                            value={alt.name}
                            onChange={(e) =>
                              handleAltNameChange(ai, e.target.value)
                            }
                            style={{
                              width: "100%",
                              padding: "0.25rem 0.35rem",
                              borderRadius: "0.35rem",
                              border: "1px solid #374151",
                              background: "#020617",
                              color: "#e5e7eb",
                              fontSize: "0.8rem",
                            }}
                          />
                          {alternatives.length > 1 && (
                            <button
                              onClick={() => removeAlternative(ai)}
                              style={{
                                marginTop: "0.2rem",
                                fontSize: "0.7rem",
                                border: "none",
                                background: "transparent",
                                color: "#fca5a5",
                                cursor: "pointer",
                              }}
                            >
                              Remove
                            </button>
                          )}
                        </td>
                        {criteria.map((_, ci) => (
                          <td
                            key={ci}
                            style={{ padding: "0.4rem 0.5rem" }}
                          >
                            <input
                              type="number"
                              value={alt.values[ci]}
                              onChange={(e) =>
                                handleValueChange(ai, ci, e.target.value)
                              }
                              style={{
                                width: "100%",
                                padding: "0.25rem 0.35rem",
                                borderRadius: "0.35rem",
                                border: "1px solid #374151",
                                background: "#020617",
                                color: "#e5e7eb",
                                fontSize: "0.8rem",
                              }}
                            />
                          </td>
                        ))}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </section>
          </div>

          {/* RIGHT: CONTROLS & OUTPUT */}
          <div>
            <section
              style={{
                marginBottom: "1rem",
                padding: "0.75rem",
                borderRadius: "0.75rem",
                border: "1px solid #1f2937",
                background: "#020617",
              }}
            >
              <div style={{ marginBottom: "0.75rem" }}>
                <label style={{ fontWeight: 600, display: "block" }}>
                  Method
                </label>
                <select
                  value={method}
                  onChange={(e) => setMethod(e.target.value)}
                  style={{
                    marginTop: "0.35rem",
                    width: "100%",
                    padding: "0.4rem",
                    borderRadius: "0.5rem",
                    border: "1px solid #374151",
                    background: "#020617",
                    color: "#e5e7eb",
                  }}
                >
                  <option value="topsis">TOPSIS only</option>
                  <option value="mairca">MAIRCA only</option>
                  <option value="all">Both (TOPSIS + MAIRCA)</option>
                </select>
              </div>

              <div style={{ marginBottom: "0.75rem" }}>
                <label style={{ display: "flex", alignItems: "center" }}>
                  <input
                    type="checkbox"
                    checked={useMerec}
                    onChange={(e) => setUseMerec(e.target.checked)}
                    style={{ marginRight: "0.5rem" }}
                  />
                  Use MEREC to compute weights automatically
                </label>
                <small style={{ color: "#9ca3af", fontSize: "0.8rem" }}>
                  Recommended for laymen. Uncheck only if you want custom
                  weights.
                </small>
              </div>

              <button
                onClick={handleRun}
                disabled={loading}
                style={{
                  width: "100%",
                  padding: "0.6rem",
                  borderRadius: "0.75rem",
                  border: "none",
                  background:
                    "linear-gradient(135deg, #22c55e, #16a34a, #0f766e)",
                  color: "white",
                  fontWeight: 600,
                  cursor: "pointer",
                  opacity: loading ? 0.7 : 1,
                }}
              >
                {loading ? "Running MCDM..." : "Run MCDM"}
              </button>
            </section>

            {error && (
              <div
                style={{
                  marginBottom: "1rem",
                  padding: "0.75rem",
                  borderRadius: "0.75rem",
                  background: "#450a0a",
                  color: "#fecaca",
                  fontSize: "0.85rem",
                }}
              >
                <strong>Error:</strong> {error}
              </div>
            )}

            {response && (
              <section
                style={{
                  padding: "0.75rem",
                  borderRadius: "0.75rem",
                  border: "1px solid #1f2937",
                  background: "#020617",
                  fontSize: "0.85rem",
                }}
              >
                <h3>Weights Used</h3>
                <p style={{ marginTop: "0.25rem" }}>
                  {response.weights_used
                    .map((w, i) => `${criteria[i]?.name || "C" + (i + 1)}: ${w.toFixed(4)}`)
                    .join(" | ")}
                </p>

                {renderRanking()}
              </section>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
