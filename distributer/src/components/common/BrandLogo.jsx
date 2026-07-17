import { APP_NAME } from '../../utils/constants';

export default function BrandLogo({ className = 'brand-logo', alt = APP_NAME }) {
  return (
    <img
      className={className}
      src={`${process.env.PUBLIC_URL}/arg_logo.png`}
      alt={alt}
      decoding="async"
    />
  );
}
