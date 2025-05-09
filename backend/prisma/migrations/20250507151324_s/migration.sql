-- CreateIndex
CREATE INDEX "Client_isActive_idx" ON "Client"("isActive");

-- CreateIndex
CREATE INDEX "Client_dueDate_idx" ON "Client"("dueDate");

-- CreateIndex
CREATE INDEX "Client_email_idx" ON "Client"("email");

-- CreateIndex
CREATE INDEX "PaymentMethod_isActive_idx" ON "PaymentMethod"("isActive");

-- CreateIndex
CREATE INDEX "Plan_isActive_idx" ON "Plan"("isActive");

-- CreateIndex
CREATE INDEX "PlanPaymentMethodDiscount_planId_idx" ON "PlanPaymentMethodDiscount"("planId");

-- CreateIndex
CREATE INDEX "PlanPaymentMethodDiscount_paymentMethodId_idx" ON "PlanPaymentMethodDiscount"("paymentMethodId");
