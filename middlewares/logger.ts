import { Request, Response, NextFunction } from "express";

const logger = (req: Request, res: Response, next: NextFunction) => {
	console.log(
		"Request:",
		req.method,
		req.url,
		"Time:",
		new Date().toLocaleString()
	);
	next();
};

export { logger };
