const { PermissionRoute } = require('../../MODALS/Permission');
const UserData = require('../../MODALS/userData');
class ROUTES {
    /**
     * Fetch all routes accessible by the user based on their role.
     */
    // async getRoutesByRole(req, res) {
    //     try {
    //         console.log("User Role:", req.user);

    //         // Query routes based on user role and menu visibility
    //         const query = {
    //             roles: { $in: req.user.role },
    //             'menuMeta.showInMenu': true,
    //             routeFor: req.user.role // Fetch routes based on role category (admin/user)
    //         };

    //         const routes = await PermissionRoute.find(query)
    //             .select('route menuMeta')
    //             .sort('menuMeta.order');

    //         // Process routes for frontend use
    //         const processedRoutes = routes.map(r => ({
    //             path: r.route,
    //             ...r.menuMeta
    //         }));

    //         return res.json({
    //             success: true,
    //             routes: processedRoutes
    //         });
    //     } catch (error) {
    //         console.error('Failed to fetch routes:', error);
    //         return res.status(500).json({
    //             success: false,
    //             message: 'Failed to fetch routes'
    //         });
    //     }
    // }

    async getRoutesByRole(req, res) {
        try {
            console.log("Fetching routes for UID:", req.user.uid);
    
            // Get full user details from the database
            const user = await UserData.findOne({ uid: req.user.uid });
            if (!user || !user.roles || user.roles.length === 0) {
                return res.status(403).json({
                    success: false,
                    message: 'User not found or roles missing'
                });
            }
    
            console.log("User Roles:", user.roles);
    
            // Fetch all routes under 'admin' section (assumed for admin/manager) with showInMenu true
            const routes = await PermissionRoute.find({
                routeFor: "admin",
                'menuMeta.showInMenu': true
            }).select('route roles menuMeta').sort('menuMeta.order');
    
            // Match user's roles to permission roles
            const processedRoutes = routes.map(r => {
                const hasAccess = r.roles.some(role => user.roles.includes(role));
                return {
                    path: r.route,
                    ...r.menuMeta,
                    showInMenu: hasAccess // Only true if user has one of the allowed roles
                };
            });
    
            return res.json({
                success: true,
                routes: processedRoutes
            });
        } catch (error) {
            console.error('Failed to fetch routes:', error);
            return res.status(500).json({
                success: false,
                message: 'Failed to fetch routes'
            });
        }
    }
    
    /**
     * Fetch all routes based on a specified role (public, admin, user, manager).
     */
    async getRoutesByUserRole(req, res) {
        try {
            console.log("query ", req.query);
            const { role } = req.query; // Get role from query params

            if (!role) {
                return res.status(400).json({ message: "Role is required." });
            }

            // Fetch all routes where the given role is present
            const routes = await PermissionRoute.find({ roles: role })
                .select("route routeFor method roles menuMeta description")
                .sort({ "menuMeta.order": 1 });

            if (routes.length === 0) {
                return res.status(404).json({ message: `No routes found for role '${role}'.` });
            }

            return res.status(200).json({ success: true, routes });

        } catch (error) {
            console.error("Error fetching routes by role:", error);
            return res.status(500).json({ message: "Internal server error." });
        }
    }

    /**
     * Add or remove a role from a route.
     */
    // async updateRouteRole(req, res) {
    //     try {
    //         const { route, routeFor, role, action } = req.body;

    //         console.log("req.body",req.body)
    //         // Find the route based on `route` and `routeFor`
    //         const permission = await PermissionRoute.findOne({ route, routeFor });

    //         if (!permission) {
    //             return res.status(404).json({ message: "Route not found." });
    //         }

    //         if (action === 'add') {
    //             // Add role if not already assigned
    //             if (!permission.roles.includes(role)) {
    //                 permission.roles.push(role);
    //                 await permission.save();
    //                 return res.status(200).json({ success: true, message: `Role '${role}' added to route '${route}' for '${routeFor}'.` });
    //             } else {
    //                 return res.status(400).json({ success: false, message: `Route already has role '${role}'.` });
    //             }
    //         } else if (action === 'remove') {
    //             // Remove role if it exists
    //             if (permission.roles.includes(role)) {
    //                 permission.roles = permission.roles.filter(r => r !== role);
    //                 await permission.save();
    //                 return res.status(200).json({ success: true, message: `Role '${role}' removed from route '${route}' for '${routeFor}'.` });
    //             } else {
    //                 return res.status(400).json({ success: false, message: `Route does not have role '${role}'.` });
    //             }
    //         } else {
    //             return res.status(400).json({ message: "Invalid action. Use 'add' or 'remove'." });
    //         }

    //     } catch (error) {
    //         console.error("Error updating route role:", error);
    //         return res.status(500).json({ message: "Internal server error." });
    //     }
    // }

    // async updateRouteRole(req, res) {
    //     try {
    //         const { route, routeFor, role, action } = req.body;
    
            
    
    //         if (!Array.isArray(role)) {
    //             return res.status(400).json({ message: "Role must be an array." });
    //         }
    
    //         // Find the route based on `route` and `routeFor`
    //         const permission = await PermissionRoute.findOne({ route, routeFor });
    
    //         if (!permission) {
    //             return res.status(404).json({ message: "Route not found." });
    //         }
    
    //         if (action === 'add') {
    //             // Add roles that are not already assigned
    //             const newRoles = role.filter(r => !permission.roles.includes(r));
    //             if (newRoles.length > 0) {
    //                 permission.roles.push(...newRoles);
    //                 await permission.save();
    //                 return res.status(200).json({ 
    //                     success: true, 
    //                     message: `Roles ${newRoles.join(', ')} added to route '${route}' for '${routeFor}'.` 
    //                 });
    //             } else {
    //                 return res.status(400).json({ 
    //                     success: false, 
    //                     message: `All roles already exist for this route.` 
    //                 });
    //             }
    //         } else if (action === 'remove') {
    //             // Remove roles if they exist
    //             const existingRoles = role.filter(r => permission.roles.includes(r));
    //             if (existingRoles.length > 0) {
    //                 permission.roles = permission.roles.filter(r => !existingRoles.includes(r));
    //                 await permission.save();
    //                 return res.status(200).json({ 
    //                     success: true, 
    //                     message: `Roles ${existingRoles.join(', ')} removed from route '${route}' for '${routeFor}'.` 
    //                 });
    //             } else {
    //                 return res.status(400).json({ 
    //                     success: false, 
    //                     message: `None of the roles exist for this route.` 
    //                 });
    //             }
    //         } else {
    //             return res.status(400).json({ message: "Invalid action. Use 'add' or 'remove'." });
    //         }
    
    //     } catch (error) {
    //         console.error("Error updating route role:", error);
    //         return res.status(500).json({ message: "Internal server error." });
    //     }
    // }

    async updateRouteRole(req, res) {
        try {
            const { route, routeFor, role } = req.body;
    
            if (!Array.isArray(role)) {
                return res.status(400).json({ message: "Role must be an array." });
            }
    
            // Find the route based on `route` and `routeFor`
            const permission = await PermissionRoute.findOne({ route, routeFor });
    
            if (!permission) {
                return res.status(404).json({ message: "Route not found." });
            }
    
            // Replace the existing roles with the new list of roles
            permission.roles = role;
    
            // Save the updated permission object
            await permission.save();
    
            return res.status(200).json({ 
                success: true, 
                message: `Roles updated for route '${route}' and routeFor '${routeFor}'.`
            });
        } catch (error) {
            console.error("Error updating route role:", error);
            return res.status(500).json({ message: "Internal server error." });
        }
    }

}


const RouteController = new ROUTES;

module.exports = RouteController;
