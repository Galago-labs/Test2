import { memo, type SVGProps } from 'react';
import type { SvgAsset } from '../assets/svg';

export type LocalSvgProps = Omit<SVGProps<SVGSVGElement>, 'children' | 'dangerouslySetInnerHTML'>;

export const LocalSvg = memo(function LocalSvg({ asset, ...props }: LocalSvgProps & { asset: SvgAsset }) {
  return <svg
    xmlns="http://www.w3.org/2000/svg" viewBox={asset.viewBox} fill={asset.fill}
    stroke={asset.stroke} strokeWidth={asset.strokeWidth} strokeLinecap={asset.strokeLinecap} strokeLinejoin={asset.strokeLinejoin}
    aria-hidden={props['aria-label'] ? undefined : true} focusable="false" {...props}
    dangerouslySetInnerHTML={{ __html: asset.body }}
  />;
});