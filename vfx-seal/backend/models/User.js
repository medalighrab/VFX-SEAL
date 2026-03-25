const bcrypt = require("bcryptjs");

module.exports = (sequelize, DataTypes) => {
  const User = sequelize.define(
    "User",
    {
      id: {
        type: DataTypes.INTEGER,
        autoIncrement: true,
        primaryKey: true,
      },
      name: {
        type: DataTypes.STRING,
        allowNull: false,
      },
      company: {
        type: DataTypes.STRING,
        allowNull: false,
      },
      email: {
        type: DataTypes.STRING,
        allowNull: false,
        unique: true,
        validate: { isEmail: true },
      },
      passwordHash: {
        type: DataTypes.STRING,
        allowNull: false,
      },
      country: {
        type: DataTypes.STRING,
        allowNull: false,
      },
      roleInCompany: {
        type: DataTypes.STRING,
        allowNull: false,
      },
      linkedin: {
        type: DataTypes.STRING,
        allowNull: false,
        defaultValue: "",
      },
      role: {
        type: DataTypes.ENUM("STUDIO", "ADMIN"),
        allowNull: false,
        defaultValue: "STUDIO",
      },
      status: {
        type: DataTypes.ENUM("PENDING", "APPROVED", "REJECTED"),
        allowNull: false,
        defaultValue: "PENDING",
      },
      resetPasswordToken: {
        type: DataTypes.STRING,
        allowNull: true,
      },
      resetPasswordExpires: {
        type: DataTypes.DATE,
        allowNull: true,
      },
    },
    {
      indexes: [{ unique: true, fields: ["email"] }],
      hooks: {
        beforeSave: async (user) => {
          if (!user.changed("passwordHash")) return;
          const salt = await bcrypt.genSalt(12);
          user.passwordHash = await bcrypt.hash(user.passwordHash, salt);
        },
      },
    },
  );

  User.prototype.comparePassword = async function comparePassword(
    candidatePassword,
  ) {
    return bcrypt.compare(candidatePassword, this.passwordHash);
  };

  User.prototype.toJSON = function toJSON() {
    const obj = { ...this.get() };
    obj._id = String(obj.id);
    delete obj.passwordHash;
    delete obj.resetPasswordToken;
    delete obj.resetPasswordExpires;
    return obj;
  };

  return User;
};
