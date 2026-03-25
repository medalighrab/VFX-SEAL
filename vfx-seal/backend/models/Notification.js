module.exports = (sequelize, DataTypes) => {
  const Notification = sequelize.define(
    "Notification",
    {
      id: {
        type: DataTypes.INTEGER,
        autoIncrement: true,
        primaryKey: true,
      },
      userId: {
        type: DataTypes.INTEGER,
        allowNull: false,
      },
      type: {
        type: DataTypes.ENUM(
          "CONTACT_REPLY",
          "FEEDBACK_APPROVED",
          "FEEDBACK_REJECTED",
          "FEEDBACK_REMOVED",
          "NEW_CONTACT",
          "NEW_FEEDBACK",
          "FLAGGED_FEEDBACK",
          "AUDIT_REQUEST_UPDATE",
          "VENDOR_VERIFICATION_UPDATE",
          "SYSTEM",
        ),
        allowNull: false,
      },
      title: {
        type: DataTypes.STRING,
        allowNull: false,
      },
      message: {
        type: DataTypes.STRING,
        allowNull: false,
      },
      read: {
        type: DataTypes.BOOLEAN,
        allowNull: false,
        defaultValue: false,
      },
      relatedId: {
        type: DataTypes.INTEGER,
        allowNull: true,
      },
      link: {
        type: DataTypes.STRING,
        allowNull: false,
        defaultValue: "",
      },
    },
    {
      indexes: [{ fields: ["userId"] }],
    },
  );

  Notification.prototype.toJSON = function toJSON() {
    const data = { ...this.get() };
    data._id = String(data.id);
    return data;
  };

  return Notification;
};
