import Customer from "../models/Customer.js";
import Sale from "../models/Sale.js";
import { cache } from "../utils/cache.js";

export const addCustomer = async (req, res) => {
  try {
    const { name, phone, address, creditLimit } = req.body;

    if (!name || !phone) {
      return res
        .status(400)
        .json({ success: false, message: "Name and phone are required." });
    }

    const existing = await Customer.findOne({
      phone,
      shop: req.shop.id,
    }).lean();
    if (existing) {
      return res.status(400).json({
        success: false,
        message: "Customer with this phone already exists.",
      });
    }

    const customer = await Customer.create({
      shop: req.shop.id,
      name,
      phone,
      address: address || "",
      creditLimit: creditLimit || 0,
    });

    cache.invalidate(`customers:${req.shop.id}`);

    res.status(201).json({
      success: true,
      data: customer,
      message: "Customer added! 👤",
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

export const getCustomers = async (req, res) => {
  try {
    const key = `customers:${req.shop.id}`;
    const cached = cache.get(key);
    if (cached) {
      return res
        .status(200)
        .json({
          success: true,
          count: cached.length,
          data: cached,
          cached: true,
        });
    }

    const customers = await Customer.find({ shop: req.shop.id })
      .sort("-createdAt")
      .lean();

    cache.set(key, customers, 60_000); // 60s TTL

    res
      .status(200)
      .json({ success: true, count: customers.length, data: customers });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

export const updateCustomer = async (req, res) => {
  try {
    const customer = await Customer.findOne({
      _id: req.params.id,
      shop: req.shop.id,
    });

    if (!customer) {
      return res
        .status(404)
        .json({ success: false, message: "Customer not found." });
    }

    const {
      totalCredit,
      name,
      phone,
      address,
      creditLimit,
      paymentAmount,
      paymentNote,
    } = req.body;

    if (paymentAmount && paymentAmount > 0) {
      if (paymentAmount > customer.totalCredit) {
        return res.status(400).json({
          success: false,
          message: "Payment exceeds outstanding due amount.",
        });
      }
      customer.totalCredit -= paymentAmount;
      customer.khataHistory.push({
        transactionType: "PAYMENT_RECEIVED",
        amount: paymentAmount,
        description: paymentNote || "Manual payment received",
      });
    }

    if (totalCredit !== undefined && paymentAmount === undefined) {
      customer.totalCredit = totalCredit;
    }

    if (name) customer.name = name;
    if (phone) customer.phone = phone;
    if (address !== undefined) customer.address = address;
    if (creditLimit !== undefined) customer.creditLimit = creditLimit;

    await customer.save();

    cache.invalidate(`customers:${req.shop.id}`);

    res
      .status(200)
      .json({ success: true, data: customer, message: "Customer updated!" });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

export const getCustomerHistory = async (req, res) => {
  try {
    const [customer, sales] = await Promise.all([
      Customer.findOne({ _id: req.params.id, shop: req.shop.id }).lean(),
      Sale.find({ shop: req.shop.id, customer: req.params.id })
        .sort("-createdAt")
        .limit(50)
        .lean(),
    ]);

    if (!customer) {
      return res
        .status(404)
        .json({ success: false, message: "Customer not found." });
    }

    const itemFrequency = {};
    sales.forEach((sale) => {
      sale.items.forEach((item) => {
        const key = item.itemId.toString();
        if (!itemFrequency[key]) {
          itemFrequency[key] = {
            name: item.name || "Unknown",
            quantity: 0,
            times: 0,
          };
        }
        itemFrequency[key].quantity += item.quantity;
        itemFrequency[key].times += 1;
      });
    });

    const topItems = Object.values(itemFrequency)
      .sort((a, b) => b.quantity - a.quantity)
      .slice(0, 5);

    res.status(200).json({
      success: true,
      data: {
        customer,
        sales,
        topItems,
        totalSpent: sales.reduce((sum, s) => sum + s.totalAmount, 0),
        totalVisits: sales.length,
      },
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

export const scheduleReminder = async (req, res) => {
  try {
    const customer = await Customer.findOne({
      _id: req.params.id,
      shop: req.shop.id,
    });

    if (!customer) {
      return res
        .status(404)
        .json({ success: false, message: "Customer not found." });
    }

    const { scheduledDate } = req.body;

    customer.nextReminderDate = scheduledDate
      ? new Date(scheduledDate)
      : new Date(Date.now() + 24 * 60 * 60 * 1000);
    await customer.save();

    cache.invalidate(`customers:${req.shop.id}`);

    res.status(200).json({
      success: true,
      message: "Reminder scheduled!",
      data: { nextReminderDate: customer.nextReminderDate },
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

export const getRemindersDue = async (req, res) => {
  try {
    const today = new Date();
    today.setHours(23, 59, 59, 999);

    const customers = await Customer.find({
      shop: req.shop.id,
      totalCredit: { $gt: 0 },
      nextReminderDate: { $lte: today },
    }).lean();

    res
      .status(200)
      .json({ success: true, count: customers.length, data: customers });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};
