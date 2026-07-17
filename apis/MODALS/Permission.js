const mongoose = require('mongoose');

const PermissionSchema = new mongoose.Schema({
    route: {
        type: String,
        required: true
    },
    routeFor: {
        type: String,
        required: true,
        enum: ['admin', 'user', 'franchise', 'distributor', 'theme']  // Public routes are included under each panel
    },
    method: {
        type: String,
        required: true,
        enum: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH']
    },
    roles: [{
        type: String,
        enum: ['public', 'admin', 'user', 'manager', 'franchise', 'distributor', 'theme']
    }],
    menuMeta: {
        label: { type: String },
        icon: String,
        order: { type: Number },
        parent: String,
        showInMenu: {
            type: Boolean,
            default: true
        },
    },
    description: { type: String, default: '' }
});

const PermissionRoute = mongoose.model('Permission', PermissionSchema);

module.exports = { PermissionRoute };