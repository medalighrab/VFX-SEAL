module.exports = (sequelize, DataTypes) => {
  const Feedback = sequelize.define(
    "Feedback",
    {
      id: {
        type: DataTypes.INTEGER,
        autoIncrement: true,
        primaryKey: true,
      },
      vendorId: {
        type: DataTypes.INTEGER,
        allowNull: false,
      },
      studioId: {
        type: DataTypes.INTEGER,
        allowNull: false,
      },
      studioName: {
        type: DataTypes.STRING,
        allowNull: false,
      },
      rating: {
        type: DataTypes.INTEGER,
        allowNull: false,
        validate: { min: 1, max: 5 },
      },
      message: {
        type: DataTypes.STRING(2000),
        allowNull: false,
      },
      status: {
        type: DataTypes.ENUM("PENDING", "APPROVED", "REJECTED"),
        allowNull: false,
        defaultValue: "PENDING",
      },
      isFlagged: {
        type: DataTypes.BOOLEAN,
        allowNull: false,
        defaultValue: false,
      },
      flagReason: {
        type: DataTypes.STRING,
        allowNull: false,
        defaultValue: "",
      },
      moderationStatus: {
        type: DataTypes.ENUM("visible", "flagged", "deleted"),
        allowNull: false,
        defaultValue: "visible",
      },
      adminNote: {
        type: DataTypes.STRING,
        allowNull: false,
        defaultValue: "",
      },
    },
    {
      indexes: [
        { unique: true, fields: ["vendorId", "studioId"] },
        { fields: ["status", "isFlagged", "moderationStatus"] },
        { fields: ["vendorId", "status"] },
        { fields: ["createdAt"] },
      ],
    },
  );

  Feedback.prototype.toJSON = function toJSON() {
    const data = { ...this.get() };
    data._id = String(data.id);
    return data;
  };

  return Feedback;
};
