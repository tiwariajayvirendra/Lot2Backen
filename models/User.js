import mongoose from "mongoose";

const TicketSchema = new mongoose.Schema({
  ticketNumber: { type: String, required: true },
  skimId: { type: String },
  amountPaid: { type: Number, required: true },
  purchaseDate: { type: Date, default: Date.now },
  downloadLink: { type: String },
  paymentStatus: { type: String, enum: ["Pending", "Paid"], default: "Pending" },
  razorpayOrderId: { type: String, default: "" },
  razorpayPaymentId: { type: String, default: "" },
  razorpaySignature: { type: String, default: "" },
});

const UserSchema = new mongoose.Schema({
  fullName: { type: String, required: true },
  mobile: { type: String, required: true, unique: true, match: /^\d{10}$/, index: true },
  state: { type: String, required: true },
  age: { type: Number, required: true },
  aadhaar: { type: String, match: /^\d{12}$/, unique: true, sparse: true, default: null },
  tickets: {
    type: [TicketSchema],
    validate: {
      validator: function (v) {
        const numbers = v.map((t) => t.ticketNumber);
        return numbers.length === new Set(numbers).size;
      },
      message: "Duplicate ticket numbers are not allowed",
    },
  },
  email: { type: String, unique: true, sparse: true, lowercase: true, default: null },
  password: { type: String },
}, { timestamps: true });

export default mongoose.model("User", UserSchema);
