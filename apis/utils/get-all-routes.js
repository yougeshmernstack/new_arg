function getAllRoutes(app) {
    const routes = [];

    app._router.stack.forEach((middleware) => {
        if (middleware.route) {
            // Routes registered directly on the app
            const route = {};
            route.method = Object.keys(middleware.route.methods)[0].toUpperCase();
            route.path = middleware.route.path;
            routes.push(route);
            console.log('route',route)
        } else if (middleware.name === 'router') {
            console.log('middleware',middleware.handle.stack)
            // Routes registered on routers/mounted apps
            middleware.handle.stack.forEach((handler) => {
                if (handler.route) {
                    const nestedRoute = {};
                    nestedRoute.method = Object.keys(handler.route.methods)[0].toUpperCase();
                    nestedRoute.path =  handler.route.path;
                    routes.push(nestedRoute);
                }
            });
        }
    });

    return routes;
}
function getAuthRoutes(router) {
    return router.stack.map((layer) => {
        if (layer.route) {
            return {
                method: Object.keys(layer.route.methods)[0].toUpperCase(),
                path: layer.route.path
            };
        }
    }).filter(Boolean);
}
module.exports={getAllRoutes,getAuthRoutes};