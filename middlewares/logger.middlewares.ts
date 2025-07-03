import { Request, Response, NextFunction } from "express";

const logger = (req: Request, res: Response, next: NextFunction) => {
	const startTime = new Date();

	// Log the incoming request
	console.log(
		"Request:",
		req.method,
		req.url,
		"Time:",
		startTime.toLocaleString()
	);

	// Override the res.end method to capture the final status code
	const originalEnd = res.end;
	res.end = function (
		chunk?: any,
		encoding?: any,
		cb?: (() => void) | undefined
	): Response<any, Record<string, any>> {
		// Log the response with actual status code
		const endTime = new Date();
		const duration = endTime.getTime() - startTime.getTime();

		console.log(
			"Response:",
			req.method,
			req.url,
			"Status:",
			res.statusCode,
			"Duration:",
			`${duration}ms`,
			"Time:",
			endTime.toLocaleString()
		);

		// Call the original end method and return its result
		return originalEnd.call(this, chunk, encoding, cb) as Response<
			any,
			Record<string, any>
		>;
	};

	next();
};

export { logger };
