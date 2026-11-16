import { useEffect, useState } from "react"
import { useSearchParams, useNavigate } from "react-router-dom"

import DashboardNavbar from "../components/DashboardNavbar"
import Sidebar from "../components/Sidebar"
import { getHealth } from "../api/health"
import { USE_API } from "../api/client"
import { useUiText } from "../i18n/useUiText"

import "../styles/PaymentPage.css"

function PaymentPage() {
  const t = useUiText()
  const [searchParams] = useSearchParams()
  const navigate = useNavigate()
  const [billingConfigured, setBillingConfigured] = useState(false)
  const [billingChecked, setBillingChecked] = useState(!USE_API)
  const [paymentNotice, setPaymentNotice] = useState("")

  const plan = searchParams.get("plan") || "Pro"

  const planDetails = {
    Pro: {
      price: 499,
      description: "For regular clinical use",
    },

    Max: {
      price: 999,
      description: "For advanced clinical research",
    },
  }

  const selectedPlan = planDetails[plan] || planDetails.Pro

  const [showPaymentMethods, setShowPaymentMethods] =
    useState(false)

  const [selectedPaymentMethod, setSelectedPaymentMethod] =
    useState("")

  const handleBack = () => {
    navigate("/upgrade")
  }

  const handlePaymentMethodSelect = (method) => {
    setSelectedPaymentMethod(method)
    setShowPaymentMethods(false)
  }

  useEffect(() => {
    if (!USE_API) return
    getHealth()
      .then((health) => setBillingConfigured(Boolean(health.billingConfigured)))
      .catch(() => setBillingConfigured(false))
      .finally(() => setBillingChecked(true))
  }, [])

  const handlePayment = () => {
    if (!selectedPaymentMethod) return
    if (!billingConfigured) {
      setPaymentNotice(t("paymentNotConfigured"))
      return
    }
    setPaymentNotice(t("paymentCheckoutNotIntegrated"))
  }

  return (
    <div className="payment-page-layout">

      <DashboardNavbar />

      <div className="payment-page-body">

        <Sidebar />

        <main className="payment-page-content">

          <div className="payment-container">

            {/* BACK BUTTON */}

            <button
              type="button"
              className="payment-back-button"
              onClick={handleBack}
            >
              ← {t("backToPlans")}
            </button>


            {/* PAYMENT CARD */}

            <div className="payment-card">

              <p className="payment-label">
                SUBSCRIPTION
              </p>

              <h1>
                {t("paymentTitle")}
              </h1>

              {billingChecked && !billingConfigured && (
                <p className="payment-note" role="status">
                  {t("paymentUnavailable")}
                </p>
              )}

              <p className="payment-description">
                Upgrade your Herb Intelligence plan
                to continue using advanced features.
              </p>


              {/* PLAN SUMMARY */}

              <div className="payment-plan-summary">

                <div>

                  <span>
                    Selected plan
                  </span>

                  <h2>
                    {plan}
                  </h2>

                  <p>
                    {selectedPlan.description}
                  </p>

                </div>


                <div className="payment-price">

                  <strong>
                    ₹{selectedPlan.price}
                  </strong>

                  <span>
                    /month
                  </span>

                </div>

              </div>


              {/* PAYMENT METHOD */}

              <div className="payment-method-section">

                <h3>
                  Payment method
                </h3>


                <button
                  type="button"
                  className={`payment-method ${
                    showPaymentMethods
                      ? "payment-method-open"
                      : ""
                  } ${
                    selectedPaymentMethod
                      ? "payment-method-selected"
                      : ""
                  }`}
                  onClick={() =>
                    setShowPaymentMethods(
                      !showPaymentMethods
                    )
                  }
                >

                  <span className="payment-method-icon">
                    💳
                  </span>


                  <div className="payment-method-content">

                    <strong>
                      {selectedPaymentMethod ||
                        "Online payment"}
                    </strong>

                    <p>
                      {selectedPaymentMethod
                        ? "Payment method selected"
                        : "UPI, cards and net banking"}
                    </p>

                  </div>


                  <span className="payment-method-arrow">
                    {showPaymentMethods ? "⌃" : "⌄"}
                  </span>

                </button>


                {/* PAYMENT METHOD DROPDOWN */}

                {showPaymentMethods && (

                  <div className="payment-method-dropdown">

                    <button
                      type="button"
                      className={`payment-option ${
                        selectedPaymentMethod ===
                        "UPI"
                          ? "selected"
                          : ""
                      }`}
                      onClick={() =>
                        handlePaymentMethodSelect(
                          "UPI"
                        )
                      }
                    >

                      <span className="payment-option-icon">
                        U
                      </span>

                      <div>
                        <strong>
                          UPI
                        </strong>

                        <p>
                          Google Pay, PhonePe,
                          Paytm and more
                        </p>
                      </div>

                      {selectedPaymentMethod ===
                        "UPI" && (
                        <span className="payment-option-check">
                          ✓
                        </span>
                      )}

                    </button>


                    <button
                      type="button"
                      className={`payment-option ${
                        selectedPaymentMethod ===
                        "Credit / Debit Card"
                          ? "selected"
                          : ""
                      }`}
                      onClick={() =>
                        handlePaymentMethodSelect(
                          "Credit / Debit Card"
                        )
                      }
                    >

                      <span className="payment-option-icon">
                        💳
                      </span>

                      <div>
                        <strong>
                          Credit / Debit Card
                        </strong>

                        <p>
                          Visa, Mastercard and
                          other cards
                        </p>
                      </div>

                      {selectedPaymentMethod ===
                        "Credit / Debit Card" && (
                        <span className="payment-option-check">
                          ✓
                        </span>
                      )}

                    </button>


                    <button
                      type="button"
                      className={`payment-option ${
                        selectedPaymentMethod ===
                        "Net Banking"
                          ? "selected"
                          : ""
                      }`}
                      onClick={() =>
                        handlePaymentMethodSelect(
                          "Net Banking"
                        )
                      }
                    >

                      <span className="payment-option-icon">
                        🏦
                      </span>

                      <div>
                        <strong>
                          Net Banking
                        </strong>

                        <p>
                          Pay using your bank
                          account
                        </p>
                      </div>

                      {selectedPaymentMethod ===
                        "Net Banking" && (
                        <span className="payment-option-check">
                          ✓
                        </span>
                      )}

                    </button>

                  </div>

                )}

              </div>


              {/* PAYMENT BUTTON */}

              <button
                type="button"
                className={`payment-button ${
                  !selectedPaymentMethod
                    ? "disabled"
                    : ""
                }`}
                disabled={!selectedPaymentMethod || !billingConfigured}
                onClick={handlePayment}
              >

                {selectedPaymentMethod
                  ? `Pay ₹${selectedPlan.price}`
                  : t("paymentSelectMethod")}

              </button>


              {/* PAYMENT NOTE */}

              <p className="payment-note" role={paymentNotice ? "alert" : undefined}>

                {paymentNotice
                  || (selectedPaymentMethod
                    ? (billingConfigured
                      ? "Payment checkout will open when billing is fully integrated."
                      : t("paymentNotConfigured"))
                    : "Choose a payment method to continue.")}

              </p>

            </div>

          </div>

        </main>

      </div>

    </div>
  )
}

export default PaymentPage