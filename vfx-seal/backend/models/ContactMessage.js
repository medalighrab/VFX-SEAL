module.exports = (sequelize, DataTypes) => {
  const ContactMessage = sequelize.define("ContactMessage", {
    id: {
      type: DataTypes.INTEGER,
      autoIncrement: true,
      primaryKey: true,
    },
    direction: {
      type: DataTypes.ENUM("INBOUND", "OUTBOUND"),
      allowNull: false,
      defaultValue: "INBOUND",
    },
    senderType: {
      type: DataTypes.ENUM("STUDIO", "ADMIN"),
      allowNull: false,
      defaultValue: "STUDIO",
    },
    senderId: {
      type: DataTypes.INTEGER,
      allowNull: true,
    },
    senderName: {
      type: DataTypes.STRING,
      allowNull: false,
      defaultValue: "",
    },
    senderEmail: {
      type: DataTypes.STRING,
      allowNull: false,
      defaultValue: "",
    },
    senderCompany: {
      type: DataTypes.STRING,
      allowNull: false,
      defaultValue: "",
    },
    studioId: {
      type: DataTypes.INTEGER,
      allowNull: true,
    },
    studioName: {
      type: DataTypes.STRING,
      allowNull: false,
    },
    studioEmail: {
      type: DataTypes.STRING,
      allowNull: false,
    },
    recipientId: {
      type: DataTypes.INTEGER,
      allowNull: true,
    },
    recipientName: {
      type: DataTypes.STRING,
      allowNull: false,
      defaultValue: "",
    },
    recipientEmail: {
      type: DataTypes.STRING,
      allowNull: false,
      defaultValue: "",
    },
    recipientCompany: {
      type: DataTypes.STRING,
      allowNull: false,
      defaultValue: "",
    },
    subject: {
      type: DataTypes.STRING(200),
      allowNull: false,
    },
    message: {
      type: DataTypes.STRING(5000),
      allowNull: false,
    },
    status: {
      type: DataTypes.ENUM("NEW", "REPLIED", "CLOSED"),
      allowNull: false,
      defaultValue: "NEW",
    },
    adminReply: {
      type: DataTypes.STRING,
      allowNull: false,
      defaultValue: "",
    },
    repliedAt: {
      type: DataTypes.DATE,
      allowNull: true,
    },
    adminReadAt: {
      type: DataTypes.DATE,
      allowNull: true,
    },
    studioReadAt: {
      type: DataTypes.DATE,
      allowNull: true,
    },
  });

  ContactMessage.prototype.toJSON = function toJSON() {
    const data = { ...this.get() };
    data._id = String(data.id);
    return data;
  };

  return ContactMessage;
};
