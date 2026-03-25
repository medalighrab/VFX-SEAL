const { Op } = require("sequelize");

module.exports = (sequelize, DataTypes) => {
  const AuditRequest = sequelize.define(
    "AuditRequest",
    {
      id: {
        type: DataTypes.INTEGER,
        autoIncrement: true,
        primaryKey: true,
      },
      requesterId: {
        type: DataTypes.INTEGER,
        allowNull: false,
      },
      requesterName: {
        type: DataTypes.STRING,
        allowNull: false,
      },
      requesterCompany: {
        type: DataTypes.STRING,
        allowNull: false,
      },
      requesterEmail: {
        type: DataTypes.STRING,
        allowNull: false,
      },
      vendorId: {
        type: DataTypes.INTEGER,
        allowNull: false,
      },
      vendorName: {
        type: DataTypes.STRING,
        allowNull: false,
      },
      sectionName: {
        type: DataTypes.STRING,
        allowNull: false,
      },
      itemName: {
        type: DataTypes.STRING,
        allowNull: false,
      },
      itemType: {
        type: DataTypes.ENUM("unverified", "nonvalidated"),
        allowNull: false,
      },
      isAnonymous: {
        type: DataTypes.BOOLEAN,
        allowNull: false,
        defaultValue: false,
      },
      message: {
        type: DataTypes.STRING(500),
        allowNull: false,
        defaultValue: "",
      },
      status: {
        type: DataTypes.ENUM("pending", "accepted", "completed", "rejected"),
        allowNull: false,
        defaultValue: "pending",
      },
      statusUpdatedAt: {
        type: DataTypes.DATE,
        allowNull: true,
      },
      statusUpdatedBy: {
        type: DataTypes.INTEGER,
        allowNull: true,
      },
      adminNotes: {
        type: DataTypes.STRING(1000),
        allowNull: false,
        defaultValue: "",
      },
      emailSent: {
        type: DataTypes.BOOLEAN,
        allowNull: false,
        defaultValue: false,
      },
      emailSentAt: {
        type: DataTypes.DATE,
        allowNull: true,
      },
    },
    {
      indexes: [
        { fields: ["requesterId", "createdAt"] },
        { fields: ["vendorId", "createdAt"] },
        { fields: ["status", "createdAt"] },
        {
          name: "duplicate_prevention_index",
          fields: ["requesterId", "vendorId", "sectionName", "itemName"],
        },
      ],
    },
  );

  AuditRequest.checkDailyQuota = async function checkDailyQuota(
    userId,
    maxPerDay = 5,
  ) {
    const startOfDay = new Date();
    startOfDay.setHours(0, 0, 0, 0);

    const count = await AuditRequest.count({
      where: {
        requesterId: userId,
        createdAt: { [Op.gte]: startOfDay },
      },
    });

    return {
      used: count,
      remaining: Math.max(0, maxPerDay - count),
      canRequest: count < maxPerDay,
    };
  };

  AuditRequest.checkRecentDuplicate = async function checkRecentDuplicate(
    userId,
    vendorId,
    sectionName,
    itemName,
    hoursBack = 24,
  ) {
    const cutoffTime = new Date(Date.now() - hoursBack * 60 * 60 * 1000);

    const existing = await AuditRequest.findOne({
      where: {
        requesterId: userId,
        vendorId,
        sectionName,
        itemName,
        createdAt: { [Op.gte]: cutoffTime },
      },
    });

    return Boolean(existing);
  };

  AuditRequest.prototype.getStatusDisplay = function getStatusDisplay() {
    const statusMap = {
      pending: "Pending Review",
      accepted: "Accepted - In Progress",
      completed: "Completed",
      rejected: "Declined",
    };
    return statusMap[this.status] || this.status;
  };

  AuditRequest.prototype.toJSON = function toJSON() {
    const data = { ...this.get() };
    data._id = String(data.id);
    return data;
  };

  return AuditRequest;
};
