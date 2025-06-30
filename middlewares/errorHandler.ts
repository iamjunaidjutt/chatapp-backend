import { Request, Response, NextFunction } from "express";

interface ErrorHandler {
	(err: Error, req: Request, res: Response, next: NextFunction): void;
}

const errorHandler: ErrorHandler = (err, req, res, next) => {
	console.error("Error:", err);
	res.status(500).json({ message: "Internal Server Error" });
};

export { errorHandler };
