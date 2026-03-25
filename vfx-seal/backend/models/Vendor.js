const slugify = require("slugify");

module.exports = (sequelize, DataTypes) => {
  const Vendor = sequelize.define(
    "Vendor",
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
      slug: {
        type: DataTypes.STRING,
        allowNull: false,
        unique: true,
      },
      logo: {
        type: DataTypes.STRING,
        allowNull: false,
        defaultValue: "",
      },
      country: {
        type: DataTypes.STRING,
        allowNull: false,
      },
      size: {
        type: DataTypes.ENUM("Micro", "Small", "Medium", "Large"),
        allowNull: false,
      },
      foundedYear: {
        type: DataTypes.INTEGER,
        allowNull: true,
      },
      website: {
        type: DataTypes.STRING,
        allowNull: false,
        defaultValue: "",
      },
      demoReel: {
        type: DataTypes.STRING,
        allowNull: false,
        defaultValue: "",
      },
      shortDescription: {
        type: DataTypes.TEXT,
        allowNull: false,
        defaultValue: "",
      },
      badgeVOE: {
        type: DataTypes.ENUM("None", "Bronze", "Silver", "Gold"),
        allowNull: false,
        defaultValue: "None",
      },
      globalScore: {
        type: DataTypes.FLOAT,
        allowNull: false,
        defaultValue: 0,
        validate: { min: 0, max: 10 },
      },
      pdfReportFilePath: {
        type: DataTypes.STRING,
        allowNull: false,
        defaultValue: "",
      },
      pdfReportVisibility: {
        type: DataTypes.ENUM("members", "private"),
        allowNull: false,
        defaultValue: "private",
      },
      source: {
        type: DataTypes.ENUM("local", "odoo"),
        allowNull: false,
        defaultValue: "local",
      },
      odooId: {
        type: DataTypes.INTEGER,
        allowNull: true,
        unique: true,
      },
      lastSyncedAt: {
        type: DataTypes.DATE,
        allowNull: true,
      },
    },
    {
      indexes: [
        { fields: ["country", "size", "badgeVOE"] },
        { fields: ["badgeVOE", "globalScore"] },
        { fields: ["createdAt"] },
        { fields: ["source", "country", "size", "badgeVOE"] },
        { fields: ["slug", "source"] },
      ],
      hooks: {
        beforeValidate: (vendor) => {
          const shouldGenerateSlug =
            !vendor.slug || (vendor.changed("name") && !vendor.changed("slug"));
          if (shouldGenerateSlug) {
            vendor.slug = slugify(vendor.name || "vendor", {
              lower: true,
              strict: true,
            });
          }
        },
      },
    },
  );

  Vendor.prototype.toJSON = function toJSON() {
    const obj = { ...this.get() };
    obj._id = obj.source === "odoo" ? `odoo_${obj.odooId}` : `local_${obj.id}`;
    obj.pdfReport = {
      filePath: obj.pdfReportFilePath || "",
      visibility: obj.pdfReportVisibility || "private",
    };
    delete obj.pdfReportFilePath;
    delete obj.pdfReportVisibility;
    return obj;
  };

  return Vendor;
};
